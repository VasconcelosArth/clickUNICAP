import type { TaskStatus } from '@clickunicap/shared';

/** Catálogo único de eventos de domínio. Evento novo entra aqui, com o payload tipado. */
export const DomainEvents = {
  TaskAssigned: 'task.assigned',
  TaskStatusChanged: 'task.status_changed',
  TaskDueSoon: 'task.due_soon',
  CommentMentioned: 'comment.mentioned',
  TaskDeleting: 'task.deleting',
  TaskDeleted: 'task.deleted',
  WorkspaceDeleting: 'workspace.deleting',
  WorkspaceDeleted: 'workspace.deleted',
} as const;

export interface TaskAssignedPayload {
  taskId: string;
  assigneeId: string;
  by: string;
  workspaceId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  by: string;
  workspaceId: string;
}

export interface TaskDueSoonPayload {
  taskId: string;
  assigneeId: string;
  workspaceId: string;
}

export interface CommentMentionedPayload {
  commentId: string;
  taskId: string;
  mentionedUserId: string;
  by: string;
  workspaceId: string;
}

/*
 * Exclusões em duas fases. O banco apaga os filhos em cascata (anexos, comentários...), então quem guarda algo fora
 * do banco (ex.: os arquivos dos anexos) precisa saber o que vai sumir ANTES do delete e só agir DEPOIS do commit:
 *
 *   const payload: TaskDeletedPayload = { ... };
 *   await this.events.emitAsync(DomainEvents.TaskDeleting, payload); // antes: ouvintes só leem e se preparam
 *   await this.repo.delete(...);
 *   this.events.emit(DomainEvents.TaskDeleted, payload);              // depois do commit: o MESMO objeto
 *
 * O `*.deleting` é aguardado, mas não pode impedir a exclusão: uma falha do ouvinte só vai para o log.
 * Se o delete falhar, o `*.deleted` não é emitido e nada é apagado.
 */
export interface TaskDeletedPayload {
  taskId: string;
  projectId: string;
  workspaceId: string;
}

export interface WorkspaceDeletedPayload {
  workspaceId: string;
  by: string;
}
