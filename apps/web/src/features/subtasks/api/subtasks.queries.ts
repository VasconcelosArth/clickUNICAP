import type { CreateSubtaskInput, Subtask, UpdateSubtaskInput } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subtasksApi } from './subtasks.api';
import { subtaskKeys } from './subtasks.keys';

export function useSubtasks(taskId: string) {
  return useQuery({ queryKey: subtaskKeys.byTask(taskId), queryFn: () => subtasksApi.list(taskId) });
}

export function useCreateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubtaskInput) => subtasksApi.create(taskId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) }),
  });
}

interface UpdateVariables {
  id: string;
  input: UpdateSubtaskInput;
}

/** Atualiza o cache na hora (checkbox e renomear), desfaz se a API recusar e revalida ao terminar. */
export function useUpdateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  const key = subtaskKeys.byTask(taskId);
  return useMutation({
    mutationFn: ({ id, input }: UpdateVariables) => subtasksApi.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Subtask[]>(key);
      queryClient.setQueryData<Subtask[]>(key, (list) =>
        list?.map((subtask) => (subtask.id === id ? { ...subtask, ...input } : subtask)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subtasksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) }),
  });
}
