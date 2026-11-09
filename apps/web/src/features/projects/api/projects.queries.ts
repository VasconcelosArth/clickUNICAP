import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { projectsApi } from './projects.api';
import { projectKeys } from './projects.keys';

export function useProjects(includeArchived = false) {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  return useQuery({
    queryKey: projectKeys.list(workspaceId ?? '', includeArchived),
    queryFn: () => projectsApi.list(includeArchived),
    enabled: !!workspaceId,
  });
}

export function useProject(projectId: string) {
  return useQuery({ queryKey: projectKeys.detail(projectId), queryFn: () => projectsApi.get(projectId) });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all });
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({ mutationFn: projectsApi.create, onSuccess: invalidate });
}

export function useSetProjectArchived() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ projectId, archived }: { projectId: string; archived: boolean }) =>
      archived ? projectsApi.archive(projectId) : projectsApi.unarchive(projectId),
    onSuccess: invalidate,
  });
}
