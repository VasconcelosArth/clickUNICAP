export const projectKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string, includeArchived: boolean) =>
    [...projectKeys.all, 'list', workspaceId, { includeArchived }] as const,
  detail: (projectId: string) => [...projectKeys.all, 'detail', projectId] as const,
};
