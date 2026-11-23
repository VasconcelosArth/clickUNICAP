import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notifications.api';
import { notificationKeys } from './notifications.keys';

/** O número do sino. Atualiza sozinho a cada minuto e quando a pessoa volta para a aba. */
export const UNREAD_REFRESH_MS = 60_000;

export function useUnreadCount(workspaceId: string) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(workspaceId),
    queryFn: notificationsApi.unreadCount,
    refetchInterval: UNREAD_REFRESH_MS,
  });
}

/** As notificações mais novas primeiro, de 10 em 10. Só busca quando o menu está aberto. */
export function useNotifications(workspaceId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(workspaceId),
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

/** Ler muda a lista e o contador: as duas mutações revalidam tudo do workspace. */
export function useMarkRead(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.workspace(workspaceId) }),
  });
}

export function useMarkAllRead(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.workspace(workspaceId) }),
  });
}
