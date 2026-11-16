/** Todos os caminhos do app. A lista completa está em docs/05-frontend-guia.md#rotas. */
export const routes = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  acceptInvite: '/invites/accept',
  workspaces: '/workspaces',
  profile: '/profile',
  workspace: (workspaceId: string) => `/w/${workspaceId}`,
  projects: (workspaceId: string) => `/w/${workspaceId}/projects`,
  project: (workspaceId: string, projectId: string) => `/w/${workspaceId}/p/${projectId}`,
  board: (workspaceId: string, projectId: string) => `/w/${workspaceId}/p/${projectId}/board`,
  list: (workspaceId: string, projectId: string) => `/w/${workspaceId}/p/${projectId}/list`,
  task: (workspaceId: string, taskId: string) => `/w/${workspaceId}/t/${taskId}`,
  members: (workspaceId: string) => `/w/${workspaceId}/settings/members`,
};

/** Só aceita caminhos internos, para o `?next=` não virar redirecionamento para outro site. */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
