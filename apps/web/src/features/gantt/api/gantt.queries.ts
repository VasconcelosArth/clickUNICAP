import { useQuery } from '@tanstack/react-query';
import { dependencyKeys } from '@/hooks/dependency.keys';
import { ganttApi } from './gantt.api';

/** Setas do Gantt. A chave é a mesma que o painel de dependências revalida ao criar ou remover. */
export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: dependencyKeys.byProject(projectId),
    queryFn: () => ganttApi.projectDependencies(projectId),
  });
}
