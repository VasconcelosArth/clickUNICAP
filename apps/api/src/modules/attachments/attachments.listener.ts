import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents, type TaskDeletedPayload, type WorkspaceDeletedPayload } from '@/core/events';
import { AttachmentsService } from './attachments.service';

/**
 * Apaga do storage os arquivos dos anexos quando a tarefa ou o workspace é excluído.
 *
 * O banco apaga os registros em cascata, então as chaves são lidas no `*.deleting` (antes do delete) e os arquivos
 * só saem no `*.deleted` (depois do commit). As duas fases recebem o MESMO objeto de payload (ver `core/events`):
 * se o delete falhar, o `*.deleted` não chega e nada é apagado; a entrada some sozinha com o payload (WeakMap).
 * Uma falha aqui só vai para o log e nunca impede a exclusão.
 */
@Injectable()
export class AttachmentsListener {
  private readonly logger = new Logger('Attachments');
  private readonly pending = new WeakMap<object, string[]>();

  constructor(private readonly service: AttachmentsService) {}

  @OnEvent(DomainEvents.TaskDeleting)
  onTaskDeleting(p: TaskDeletedPayload): Promise<void> {
    return this.prepare(p, () => this.service.storageKeysOfTask(p.workspaceId, p.taskId));
  }

  @OnEvent(DomainEvents.TaskDeleted, { async: true })
  onTaskDeleted(p: TaskDeletedPayload): Promise<void> {
    return this.removeFiles(p);
  }

  @OnEvent(DomainEvents.WorkspaceDeleting)
  onWorkspaceDeleting(p: WorkspaceDeletedPayload): Promise<void> {
    return this.prepare(p, () => this.service.storageKeysOfWorkspace(p.workspaceId));
  }

  @OnEvent(DomainEvents.WorkspaceDeleted, { async: true })
  onWorkspaceDeleted(p: WorkspaceDeletedPayload): Promise<void> {
    return this.removeFiles(p);
  }

  private async prepare(payload: object, readKeys: () => Promise<string[]>): Promise<void> {
    try {
      const keys = await readKeys();
      if (keys.length > 0) this.pending.set(payload, keys);
    } catch (error) {
      this.logger.error('Falha ao ler os anexos antes da exclusão; os arquivos ficam para a limpeza de órfãos', error);
    }
  }

  private async removeFiles(payload: object): Promise<void> {
    const keys = this.pending.get(payload);
    if (!keys) return;
    this.pending.delete(payload);
    try {
      await this.service.removeStoredFiles(keys);
    } catch (error) {
      this.logger.error('Falha ao apagar os arquivos dos anexos excluídos', error);
    }
  }
}
