export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (workspaceId: string) => [...workspaceKeys.all, 'detail', workspaceId] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, workspaceId, 'members'] as const,
  invites: (workspaceId: string) => [...workspaceKeys.all, workspaceId, 'invites'] as const,
};
