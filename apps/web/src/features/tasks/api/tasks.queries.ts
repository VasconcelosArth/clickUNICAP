import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './tasks.api';
import { taskKeys } from './tasks.keys';

const NO_FILTERS: TaskFilters = {};

export function useTasks(projectId: string, filters: TaskFilters = NO_FILTERS) {
  return useQuery({
    queryKey: taskKeys.list(projectId, filters),
    queryFn: () => tasksApi.list(projectId, filters),
  });
}

export function useTask(taskId: string) {
  return useQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId) });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

/** Atualiza o detalhe na hora e desfaz se a API recusar. As visões revalidam ao terminar. */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => tasksApi.update(id, input),
    onMutate: async ({ id, input }) => {
      const key = taskKeys.detail(id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task>(key);
      if (previous) queryClient.setQueryData<Task>(key, { ...previous, ...input });
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) queryClient.setQueryData(taskKeys.detail(id), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: (_result, taskId) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
      return queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
