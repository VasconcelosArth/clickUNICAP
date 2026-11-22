import type { Notification, NotificationPage, UnreadCount } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';

export const notificationIds = {
  assigned: '77777777-7777-4777-8777-777777777777',
  dueSoon: '88888888-8888-4888-8888-888888888888',
};

const payload = {
  taskId: task.id,
  taskTitle: task.title,
  projectId: ids.project,
  actorId: ids.otherUser,
  actorName: 'Bruno Lima',
};

/** Uma não lida (atribuição) e uma lida (prazo). */
export const notifications: Notification[] = [
  {
    id: notificationIds.assigned,
    type: 'task_assigned',
    refId: task.id,
    payload,
    readAt: null,
    createdAt: '2026-11-04T12:00:00.000Z',
  },
  {
    id: notificationIds.dueSoon,
    type: 'task_due_soon',
    refId: task.id,
    payload: { ...payload, actorId: null, actorName: null },
    readAt: '2026-11-04T11:00:00.000Z',
    createdAt: '2026-11-04T10:00:00.000Z',
  },
];

export const notificationsHandlers = [
  http.get('*/notifications/unread-count', () =>
    HttpResponse.json<UnreadCount>({ count: notifications.filter((n) => n.readAt === null).length }),
  ),
  http.get('*/notifications', () => HttpResponse.json<NotificationPage>({ data: notifications, nextCursor: null })),
  http.post('*/notifications/read-all', () => new HttpResponse(null, { status: 204 })),
  http.post('*/notifications/:id/read', ({ params }) => {
    const found = notifications.find((n) => n.id === params.id);
    if (!found)
      return HttpResponse.json({ statusCode: 404, error: 'NOT_FOUND', message: 'Não encontrada' }, { status: 404 });
    return HttpResponse.json<Notification>({ ...found, readAt: found.readAt ?? '2026-11-04T12:30:00.000Z' });
  }),
];
