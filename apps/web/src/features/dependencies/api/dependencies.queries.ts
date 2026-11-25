import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dependencyKeys } from '@/hooks/dependency.keys';
import { dependenciesApi } from './dependencies.api';

export function useTaskDependencies(taskId: string) {
  return useQuery({ queryKey: dependencyKeys.byTask(taskId), queryFn: () => dependenciesApi.listForTask(taskId) });
}

/**
 * Uma dependência sempre liga duas tarefas: se "A espera B", o detalhe de B também muda.
 * Por isso as escritas revalidam todas as chaves de dependência (detalhes abertos e o Gantt).
 */
export type DependencyLink = { taskId: string; dependsOnTaskId: string };

export function useAddDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: DependencyLink) => dependenciesApi.create(taskId, { dependsOnTaskId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dependencyKeys.all }),
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: DependencyLink) => dependenciesApi.remove(taskId, dependsOnTaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dependencyKeys.all }),
  });
}
