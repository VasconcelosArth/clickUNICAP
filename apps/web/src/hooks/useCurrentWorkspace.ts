import type { MyWorkspace } from '@clickunicap/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { workspaceKeys } from './workspace.keys';

export function useWorkspace(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId ?? ''),
    queryFn: () => api.get<MyWorkspace>(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
  });
}

export function useCurrentWorkspace() {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const query = useWorkspace(workspaceId);
  return { ...query, workspaceId, isAdmin: query.data?.myRole === 'admin' };
}

/** Só para telas dentro de /w/:workspaceId, onde o WorkspaceGate já garantiu o workspace ativo. */
export function useActiveWorkspaceId(): string {
  return useWorkspaceStore((state) => state.activeWorkspaceId) ?? '';
}
