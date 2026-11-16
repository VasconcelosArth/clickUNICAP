import type {
  CreateWorkspaceInput,
  InviteMemberInput,
  MemberRole,
  MyWorkspace,
  WorkspaceInvite,
} from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const workspacesApi = {
  listMine: () => api.get<MyWorkspace[]>('/workspaces'),
  create: (input: CreateWorkspaceInput) => api.post<MyWorkspace>('/workspaces', input),
  acceptInvite: (token: string) => api.post<MyWorkspace>('/invites/accept', { token }),
  changeRole: (workspaceId: string, userId: string, role: MemberRole) =>
    api.patch<void>(`/workspaces/${workspaceId}/members/${userId}`, { role }),
  removeMember: (workspaceId: string, userId: string) => api.delete(`/workspaces/${workspaceId}/members/${userId}`),
  listInvites: (workspaceId: string) => api.get<WorkspaceInvite[]>(`/workspaces/${workspaceId}/invites`),
  invite: (workspaceId: string, input: InviteMemberInput) =>
    api.post<WorkspaceInvite>(`/workspaces/${workspaceId}/invites`, input),
  revokeInvite: (workspaceId: string, inviteId: string) => api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`),
};
