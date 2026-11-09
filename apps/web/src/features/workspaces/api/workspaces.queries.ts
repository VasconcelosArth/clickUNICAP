import type { InviteMemberInput, MemberRole } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { workspaceKeys } from '@/hooks/workspace.keys';
import { workspacesApi } from './workspaces.api';

export function useMyWorkspaces() {
  return useQuery({ queryKey: workspaceKeys.list(), queryFn: workspacesApi.listMine });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.acceptInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
  });
}

export function useInvites(enabled: boolean) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: workspaceKeys.invites(workspaceId),
    queryFn: () => workspacesApi.listInvites(workspaceId),
    enabled,
  });
}

function useInvalidateMembers() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return () => queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
}

function useInvalidateInvites() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return () => queryClient.invalidateQueries({ queryKey: workspaceKeys.invites(workspaceId) });
}

export function useChangeMemberRole() {
  const workspaceId = useActiveWorkspaceId();
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      workspacesApi.changeRole(workspaceId, userId, role),
    onSettled: invalidate,
  });
}

export function useRemoveMember() {
  const workspaceId = useActiveWorkspaceId();
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (userId: string) => workspacesApi.removeMember(workspaceId, userId),
    onSuccess: invalidate,
  });
}

export function useInviteMember() {
  const workspaceId = useActiveWorkspaceId();
  const invalidate = useInvalidateInvites();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => workspacesApi.invite(workspaceId, input),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const workspaceId = useActiveWorkspaceId();
  const invalidate = useInvalidateInvites();
  return useMutation({
    mutationFn: (inviteId: string) => workspacesApi.revokeInvite(workspaceId, inviteId),
    onSuccess: invalidate,
  });
}
