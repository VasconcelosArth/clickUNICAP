import type { MemberWithUser } from '@clickunicap/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api-client';
import { useActiveWorkspaceId } from './useCurrentWorkspace';
import { workspaceKeys } from './workspace.keys';

export function useWorkspaceMembers() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => api.get<MemberWithUser[]>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

/** A API devolve só o `assigneeId` na tarefa: o nome vem da lista de membros. */
export function useMembersById(): Map<string, MemberWithUser> {
  const { data } = useWorkspaceMembers();
  return useMemo(() => new Map((data ?? []).map((member) => [member.userId, member])), [data]);
}
