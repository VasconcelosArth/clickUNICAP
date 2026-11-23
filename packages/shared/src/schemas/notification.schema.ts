import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../enums';
import { dateTimeSchema, idSchema, paginatedSchema, paginationQuerySchema } from './common.schema';

/**
 * Dados guardados junto com a notificação, para a caixa de entrada mostrar a mensagem sem buscar a tarefa.
 * `actorId`/`actorName` = quem causou (null em avisos automáticos, como o prazo chegando).
 */
export const notificationPayloadSchema = z.object({
  taskId: idSchema,
  taskTitle: z.string(),
  projectId: idSchema,
  actorId: idSchema.nullable(),
  actorName: z.string().nullable(),
  /** Só em `comment_mentioned`. */
  commentId: idSchema.optional(),
});
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;

/**
 * Notificação da caixa de entrada do usuário (dentro do workspace ativo).
 * `refId` aponta para a tarefa (atribuída, prazo) ou para o comentário (menção).
 */
export const notificationSchema = z.object({
  id: idSchema,
  type: z.enum(NOTIFICATION_TYPES),
  refId: idSchema,
  payload: notificationPayloadSchema,
  readAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

/** GET /api/notifications?unread=true&limit=20&cursor=<id da última notificação recebida> */
export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unread: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

/** Resposta de GET /api/notifications: as mais novas primeiro. */
export const notificationPageSchema = paginatedSchema(notificationSchema);
export type NotificationPage = z.infer<typeof notificationPageSchema>;

/** Resposta de GET /api/notifications/unread-count (o número no sino). */
export const unreadCountSchema = z.object({ count: z.number().int().min(0) });
export type UnreadCount = z.infer<typeof unreadCountSchema>;
