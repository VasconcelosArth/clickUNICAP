/** As notificações são do usuário NO workspace ativo: a chave inclui o workspace. */
export const notificationKeys = {
  all: ['notifications'] as const,
  workspace: (workspaceId: string) => [...notificationKeys.all, workspaceId] as const,
  list: (workspaceId: string) => [...notificationKeys.workspace(workspaceId), 'list'] as const,
  unreadCount: (workspaceId: string) => [...notificationKeys.workspace(workspaceId), 'unread-count'] as const,
};
