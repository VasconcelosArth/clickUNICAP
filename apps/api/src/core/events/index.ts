import type { TaskStatus } from '@clickunicap/shared';

/** Catálogo único de eventos de domínio. Evento novo entra aqui, com o payload tipado. */
export const DomainEvents = {
  TaskAssigned: 'task.assigned',
  TaskStatusChanged: 'task.status_changed',
  TaskDueSoon: 'task.due_soon',
  CommentMentioned: 'comment.mentioned',
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
