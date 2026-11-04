/**
 * Enums do domínio. FONTE ÚNICA DA VERDADE:
 * - o banco (pgEnum em apps/api/src/core/database/schema) usa estes arrays;
 * - os schemas Zod usam estes arrays;
 * - o frontend usa os rótulos (LABELS) para exibir em português.
 *
 * Para adicionar um valor: inclua aqui, gere uma migration (`pnpm --filter api db:generate`)
 * e atualize docs/06-banco-de-dados.md.
 */

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const MEMBER_ROLES = ['admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrador',
  member: 'Membro',
};

export const NOTIFICATION_TYPES = ['task_assigned', 'comment_mentioned', 'task_due_soon'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'checkbox'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
