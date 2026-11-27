import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Attachment } from '@clickunicap/shared';
import { AppConfig } from '@/core/config';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { toAttachmentDto } from './attachments.mapper';
import { type AttachmentRow, AttachmentsRepository } from './attachments.repository';
import {
  ATTACHMENT_STORAGE,
  type AttachmentStorage,
  StorageFileNotFoundError,
  generateStorageKey,
} from './storage/attachment-storage';
import { type UploadRejection, validateUpload } from './utils/attachment-rules';
import { fixLatin1FileName, sanitizeFileName } from './utils/sanitize-file-name';

export interface AttachmentContext {
  userId: string;
  workspaceId: string;
}

export interface RemoveContext extends AttachmentContext {
  /** True when the user is an admin of the active workspace. */
  isAdmin: boolean;
}

/** The part of the multipart file the service needs (kept independent of Multer types). */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface AttachmentDownload {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

const BYTES_PER_MB = 1024 * 1024;

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly tasks: TasksService, // exported by TasksModule
    private readonly projects: ProjectsService, // exported by ProjectsModule
    private readonly config: AppConfig,
    @Inject(ATTACHMENT_STORAGE) private readonly storage: AttachmentStorage,
  ) {}

  async upload(ctx: AttachmentContext, taskId: string, file: UploadedFileData | undefined): Promise<Attachment> {
    const task = await this.tasks.findOne(ctx.workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    await this.assertProjectWritable(ctx.workspaceId, task.projectId);

    if (!file) throw new DomainError('Envie um arquivo no campo "file"', 'FILE_REQUIRED', 422);

    const fileName = sanitizeFileName(fixLatin1FileName(file.originalname));
    const maxBytes = this.config.uploads.maxBytes;
    const validation = validateUpload({ fileName, declaredMimeType: file.mimetype, content: file.buffer }, maxBytes);
    if (!validation.ok) throw this.rejection(validation.reason, maxBytes);

    const storageKey = generateStorageKey();
    await this.storage.save(storageKey, file.buffer);

    let row: AttachmentRow;
    try {
      row = await this.repo.insert({
        taskId,
        uploadedBy: ctx.userId,
        fileName,
        mimeType: validation.mimeType,
        sizeBytes: file.buffer.length,
        storageKey,
      });
    } catch (error) {
      await this.discardStoredFile(storageKey); // no file without a record
      throw error;
    }
    return toAttachmentDto(row);
  }

  async list(workspaceId: string, taskId: string): Promise<Attachment[]> {
    const task = await this.tasks.findOne(workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    return (await this.repo.listByTask(workspaceId, taskId)).map(toAttachmentDto);
  }

  async get(workspaceId: string, id: string): Promise<Attachment> {
    return toAttachmentDto(await this.mustFind(workspaceId, id));
  }

  async download(workspaceId: string, id: string): Promise<AttachmentDownload> {
    const row = await this.mustFind(workspaceId, id);
    try {
      const content = await this.storage.read(row.storageKey);
      return { fileName: row.fileName, mimeType: row.mimeType, content };
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) throw new NotFoundError('Arquivo do anexo', id);
      throw error;
    }
  }

  /** Only the uploader or a workspace admin can remove. Archived projects are read-only. */
  async remove(ctx: RemoveContext, id: string): Promise<void> {
    const row = await this.mustFind(ctx.workspaceId, id);
    if (row.uploadedBy !== ctx.userId && !ctx.isAdmin) {
      throw new DomainError('Só quem enviou o anexo ou um admin pode removê-lo', 'FORBIDDEN', 403);
    }

    const task = await this.tasks.findOne(ctx.workspaceId, row.taskId);
    if (!task) throw new NotFoundError('Anexo', id);
    await this.assertProjectWritable(ctx.workspaceId, task.projectId);

    // The database is the source of truth: delete the record first, then the file.
    const deleted = await this.repo.delete(ctx.workspaceId, id);
    if (!deleted) throw new NotFoundError('Anexo', id);
    await this.discardStoredFile(deleted.storageKey);
  }

  // ---------- files left behind by deletions (see AttachmentsListener) ----------

  /** Keys to clean up when the task is deleted. Read before the delete: the cascade removes the records. */
  storageKeysOfTask(workspaceId: string, taskId: string): Promise<string[]> {
    return this.repo.listStorageKeysByTask(workspaceId, taskId);
  }

  /** Keys to clean up when the whole workspace is deleted. */
  storageKeysOfWorkspace(workspaceId: string): Promise<string[]> {
    return this.repo.listStorageKeysByWorkspace(workspaceId);
  }

  /** Removes files whose records are already gone. Never throws: a failure only goes to the log. */
  async removeStoredFiles(storageKeys: readonly string[]): Promise<void> {
    for (const storageKey of storageKeys) await this.discardStoredFile(storageKey);
  }

  /**
   * Safety net for files without a record (a crash between steps, or deletions before the cleanup existed).
   * Only files older than `olderThan` are touched, so an upload in progress (file saved, record not yet) is safe.
   * Returns how many files were removed.
   */
  async removeOrphanFiles(olderThan: Date): Promise<number> {
    const candidates = (await this.storage.list()).filter((file) => file.modifiedAt < olderThan);
    if (candidates.length === 0) return 0;

    const existing = await this.repo.findExistingStorageKeys(candidates.map((file) => file.storageKey));
    const orphans = candidates.filter((file) => !existing.has(file.storageKey));
    let removed = 0;
    for (const { storageKey } of orphans) {
      if (await this.discardStoredFile(storageKey)) removed += 1;
    }
    return removed;
  }

  private async mustFind(workspaceId: string, id: string): Promise<AttachmentRow> {
    const row = await this.repo.findById(workspaceId, id);
    if (!row) throw new NotFoundError('Anexo', id);
    return row;
  }

  /** Archived project is read-only: no new attachments and no removals. */
  private async assertProjectWritable(workspaceId: string, projectId: string): Promise<void> {
    const project = await this.projects.get(workspaceId, projectId);
    if (project.archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
  }

  /** Best effort: a leftover file is unreachable (no record points to it) and must not fail the request. */
  private async discardStoredFile(storageKey: string): Promise<boolean> {
    try {
      await this.storage.remove(storageKey);
      return true;
    } catch {
      this.logger.warn('Não foi possível apagar um arquivo de anexo do storage');
      return false;
    }
  }

  private rejection(reason: UploadRejection, maxBytes: number): DomainError {
    switch (reason) {
      case 'EMPTY_FILE':
        return new DomainError('O arquivo está vazio', 'EMPTY_FILE', 422);
      case 'FILE_TOO_LARGE':
        return new DomainError(
          `O arquivo passa do limite de ${Math.floor(maxBytes / BYTES_PER_MB)} MB`,
          'FILE_TOO_LARGE',
          422,
        );
      case 'TYPE_NOT_ALLOWED':
        return new DomainError('Tipo de arquivo não permitido', 'FILE_TYPE_NOT_ALLOWED', 422);
      case 'MIME_MISMATCH':
      case 'CONTENT_MISMATCH':
        return new DomainError('O conteúdo do arquivo não corresponde ao tipo informado', 'FILE_CONTENT_MISMATCH', 422);
    }
  }
}
