import { describe, expect, it } from 'vitest';
import { listNotificationsQuerySchema, notificationSchema } from './notification.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('listNotificationsQuerySchema', () => {
  it('usa os padrões: todas as notificações, 50 por página', () => {
    expect(listNotificationsQuerySchema.parse({})).toEqual({ unread: false, limit: 50 });
  });

  it('converte os parâmetros da URL', () => {
    expect(listNotificationsQuerySchema.parse({ unread: 'true', limit: '10', cursor: uuid })).toEqual({
      unread: true,
      limit: 10,
      cursor: uuid,
    });
  });

  it('rejeita valores inválidos', () => {
    expect(listNotificationsQuerySchema.safeParse({ unread: 'sim' }).success).toBe(false);
    expect(listNotificationsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(listNotificationsQuerySchema.safeParse({ cursor: 'abc' }).success).toBe(false);
  });
});

describe('notificationSchema', () => {
  const base = {
    id: uuid,
    type: 'task_assigned',
    refId: uuid,
    payload: { taskId: uuid, taskTitle: 'Montar a vitrine', projectId: uuid, actorId: uuid, actorName: 'Ana' },
    readAt: null,
    createdAt: '2026-11-04T18:30:00.000Z',
  };

  it('aceita uma notificação não lida', () => {
    expect(notificationSchema.parse(base)).toEqual(base);
  });

  it('aceita aviso automático (sem autor) e rejeita tipo desconhecido', () => {
    const auto = { ...base, type: 'task_due_soon', payload: { ...base.payload, actorId: null, actorName: null } };
    expect(notificationSchema.safeParse(auto).success).toBe(true);
    expect(notificationSchema.safeParse({ ...base, type: 'outro' }).success).toBe(false);
  });
});
