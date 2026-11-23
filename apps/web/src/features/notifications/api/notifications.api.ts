import type { Notification, NotificationPage, UnreadCount } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const PAGE_SIZE = 10;

export const notificationsApi = {
  list: (cursor?: string) => api.get<NotificationPage>('/notifications', { limit: String(PAGE_SIZE), cursor }),
  unreadCount: () => api.get<UnreadCount>('/notifications/unread-count'),
  markRead: (id: string) => api.post<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};
