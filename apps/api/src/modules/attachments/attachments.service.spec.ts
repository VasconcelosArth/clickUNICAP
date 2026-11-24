import { randomUUID } from 'node:crypto';
import type { AppConfig } from '@/core/config';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import type { ProjectsService } from '@/modules/projects/projects.service';
import type { TasksService } from '@/modules/tasks/tasks.service';
import { type AttachmentRow, type AttachmentsRepository, type NewAttachmentRow } from './attachments.repository';
import { AttachmentsService, type UploadedFileData } from './attachments.service';
import { StorageFailureError, isValidStorageKey } from './storage/attachment-storage';
import { MemoryAttachmentStorage } from './storage/memory-attachment-storage';

const MAX_BYTES = 1000;

// ---------- fakes (in-memory, workspace-aware like the real queries) ----------

class FakeRepo {
  rows: AttachmentRow[] = [];
  failNextInsert = false;
  constructor(private readonly workspaceOfTask: Map<string, string>) {}

  private visible(workspaceId: string, row: AttachmentRow) {
    return this.workspaceOfTask.get(row.taskId) === workspaceId;
  }
  async listByTask(workspaceId: string, taskId: string) {
    return this.rows.filter((r) => r.taskId === taskId && this.visible(workspaceId, r));
  }
  async findById(workspaceId: string, id: string) {
    return this.rows.find((r) => r.id === id && this.visible(workspaceId, r)) ?? null;
  }
  async insert(data: NewAttachmentRow) {
    if (this.failNextInsert) {
      this.failNextInsert = false;
      throw new Error('db down');
    }
    const row: AttachmentRow = { id: randomUUID(), createdAt: new Date(), ...data };
    this.rows.push(row);
    return row;
  }
  async delete(workspaceId: string, id: string) {
    const row = await this.findById(workspaceId, id);
    if (row) this.rows = this.rows.filter((r) => r.id !== id);
    return row;
  }
}

interface Fixture {
  service: AttachmentsService;
  repo: FakeRepo;
  storage: MemoryAttachmentStorage;
  ws: string;
  otherWs: string;
  taskId: string;
  archivedTaskId: string;
  user: string;
  otherUser: string;
}

function setup(): Fixture {
  const ws = randomUUID();
  const otherWs = randomUUID();
  const taskId = randomUUID();
  const archivedTaskId = randomUUID();
  const activeProject = randomUUID();
  const archivedProject = randomUUID();

  const workspaceOfTask = new Map<string, string>([
    [taskId, ws],
    [archivedTaskId, ws],
  ]);
  const projectOfTask = new Map<string, string>([
    [taskId, activeProject],
    [archivedTaskId, archivedProject],
  ]);

  const tasks = {
    async findOne(workspaceId: string, id: string) {
      return workspaceOfTask.get(id) === workspaceId ? { id, projectId: projectOfTask.get(id) } : null;
    },
  } as unknown as TasksService;

  const projects = {
    async get(workspaceId: string, projectId: string) {
      const owned = [...projectOfTask.entries()].some(
        ([task, project]) => project === projectId && workspaceOfTask.get(task) === workspaceId,
      );
      if (!owned) throw new NotFoundError('Projeto', projectId);
      return { id: projectId, archivedAt: projectId === archivedProject ? new Date() : null };
    },
  } as unknown as ProjectsService;

  const repo = new FakeRepo(workspaceOfTask);
  const storage = new MemoryAttachmentStorage();
  const config = { uploads: { dir: 'unused', maxBytes: MAX_BYTES } } as unknown as AppConfig;
  const service = new AttachmentsService(repo as unknown as AttachmentsRepository, tasks, projects, config, storage);

  return { service, repo, storage, ws, otherWs, taskId, archivedTaskId, user: randomUUID(), otherUser: randomUUID() };
}

const pdf = (name = 'doc.pdf', extra = 'x'): UploadedFileData => ({
  originalname: name,
  mimetype: 'application/pdf',
  buffer: Buffer.from(`%PDF-1.7 ${extra}`),
});

describe('AttachmentsService', () => {
  describe('upload', () => {
    it('creates the record and writes the file, returning only public metadata', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf('relatório.pdf'));

      expect(dto.taskId).toBe(f.taskId);
      expect(dto.uploadedBy).toBe(f.user);
      expect(dto.mimeType).toBe('application/pdf');
      expect(dto.sizeBytes).toBe(Buffer.from('%PDF-1.7 x').length);
      expect(Object.keys(dto).sort()).toEqual([
        'createdAt',
        'fileName',
        'id',
        'mimeType',
        'sizeBytes',
        'taskId',
        'uploadedBy',
      ]);
      expect(f.repo.rows).toHaveLength(1);
      expect(f.storage.size).toBe(1);
    });

    it('repairs a file name that Multer read as latin1', async () => {
      const f = setup();
      const garbled = Buffer.from('relatório.pdf', 'utf8').toString('latin1');
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf(garbled));
      expect(dto.fileName).toBe('relatório.pdf');
    });

    it('sanitizes a malicious name and uses a server-generated key for the storage', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf('../../etc/evil.pdf'));

      expect(dto.fileName).toBe('evil.pdf');
      const [storedKey] = f.storage.keys();
      expect(isValidStorageKey(storedKey ?? '')).toBe(true);
      expect(f.repo.rows[0]?.storageKey).toBe(storedKey);
    });

    it('stores the canonical MIME type and the real size, not the client values', async () => {
      const f = setup();
      const file: UploadedFileData = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 1, 2]),
      };
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, file);
      expect(dto.mimeType).toBe('image/jpeg');
      expect(dto.sizeBytes).toBe(5);
    });

    it('rejects a type that is not allowed without writing anything', async () => {
      const f = setup();
      const file: UploadedFileData = {
        originalname: 'run.exe',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-'),
      };
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, file)).rejects.toThrow(
        'Tipo de arquivo não permitido',
      );
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('rejects a disguised file (content does not match the type)', async () => {
      const f = setup();
      const file: UploadedFileData = {
        originalname: 'a.png',
        mimetype: 'image/png',
        buffer: Buffer.from('<html></html>'),
      };
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, file)).rejects.toBeInstanceOf(
        DomainError,
      );
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('rejects a file above the size limit without writing anything', async () => {
      const f = setup();
      const big: UploadedFileData = {
        originalname: 'big.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(MAX_BYTES)]),
      };
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, big)).rejects.toThrow('limite');
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('requires a file', async () => {
      const f = setup();
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, undefined)).rejects.toThrow(
        '"file"',
      );
    });

    it('returns not found for a missing task and for a task of another workspace', async () => {
      const f = setup();
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, randomUUID(), pdf())).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(
        f.service.upload({ userId: f.user, workspaceId: f.otherWs }, f.taskId, pdf()),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(f.storage.size).toBe(0);
    });

    it('blocks the upload when the project is archived', async () => {
      const f = setup();
      await expect(
        f.service.upload({ userId: f.user, workspaceId: f.ws }, f.archivedTaskId, pdf()),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('leaves no record when the storage fails', async () => {
      const f = setup();
      f.storage.failOnNextSave();
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf())).rejects.toBeInstanceOf(
        StorageFailureError,
      );
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('removes the written file when the database insert fails (no orphan file)', async () => {
      const f = setup();
      f.repo.failNextInsert = true;
      await expect(f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf())).rejects.toThrow('db down');
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });
  });

  describe('list, get and download', () => {
    it('lists only the attachments of the task', async () => {
      const f = setup();
      const ctx = { userId: f.user, workspaceId: f.ws };
      await f.service.upload(ctx, f.taskId, pdf('a.pdf'));
      await f.service.upload(ctx, f.archivedTaskId, pdf('b.pdf')).catch(() => undefined); // blocked, not listed
      const list = await f.service.list(f.ws, f.taskId);
      expect(list).toHaveLength(1);
      expect(list[0]?.fileName).toBe('a.pdf');
    });

    it('list returns not found for a missing task or another workspace', async () => {
      const f = setup();
      await expect(f.service.list(f.ws, randomUUID())).rejects.toBeInstanceOf(NotFoundError);
      await expect(f.service.list(f.otherWs, f.taskId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns the metadata and the file content', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf('doc.pdf', 'hello'));

      expect((await f.service.get(f.ws, dto.id)).fileName).toBe('doc.pdf');
      const download = await f.service.download(f.ws, dto.id);
      expect(download.fileName).toBe('doc.pdf');
      expect(download.mimeType).toBe('application/pdf');
      expect(download.content.toString()).toBe('%PDF-1.7 hello');
    });

    it('get and download return not found for another workspace and for unknown ids', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      await expect(f.service.get(f.otherWs, dto.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(f.service.download(f.otherWs, dto.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(f.service.get(f.ws, randomUUID())).rejects.toBeInstanceOf(NotFoundError);
    });

    it('download returns not found when the file is missing from the storage', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      for (const key of f.storage.keys()) await f.storage.remove(key);
      await expect(f.service.download(f.ws, dto.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    it('lets the uploader remove: record and file are gone', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      await f.service.remove({ userId: f.user, workspaceId: f.ws, isAdmin: false }, dto.id);
      expect(f.repo.rows).toHaveLength(0);
      expect(f.storage.size).toBe(0);
    });

    it('lets a workspace admin remove an attachment from someone else', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      await f.service.remove({ userId: f.otherUser, workspaceId: f.ws, isAdmin: true }, dto.id);
      expect(f.repo.rows).toHaveLength(0);
    });

    it('forbids a regular member who is not the uploader', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      await expect(
        f.service.remove({ userId: f.otherUser, workspaceId: f.ws, isAdmin: false }, dto.id),
      ).rejects.toThrow('Só quem enviou');
      expect(f.repo.rows).toHaveLength(1);
      expect(f.storage.size).toBe(1);
    });

    it('returns not found for another workspace, even for an admin', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      await expect(
        f.service.remove({ userId: f.otherUser, workspaceId: f.otherWs, isAdmin: true }, dto.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(f.repo.rows).toHaveLength(1);
    });

    it('blocks the removal when the project is archived', async () => {
      const f = setup();
      // Seed an attachment that belongs to a task of an archived project.
      const key = 'e3a1c9f0-0000-4000-8000-000000000001';
      await f.storage.save(key, Buffer.from('%PDF-1'));
      f.repo.rows.push({
        id: randomUUID(),
        taskId: f.archivedTaskId,
        uploadedBy: f.user,
        fileName: 'old.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 6,
        storageKey: key,
        createdAt: new Date(),
      });
      const id = f.repo.rows[0]?.id ?? '';
      await expect(f.service.remove({ userId: f.user, workspaceId: f.ws, isAdmin: true }, id)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(f.repo.rows).toHaveLength(1);
      expect(f.storage.size).toBe(1);
    });

    it('still succeeds when the file cannot be deleted from the storage (record is gone)', async () => {
      const f = setup();
      const dto = await f.service.upload({ userId: f.user, workspaceId: f.ws }, f.taskId, pdf());
      f.storage.failOnNextRemove();
      await f.service.remove({ userId: f.user, workspaceId: f.ws, isAdmin: false }, dto.id);
      expect(f.repo.rows).toHaveLength(0);
    });
  });
});
