import type { MoveTaskInput, Task } from '@clickunicap/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/features/tasks';
import { applyMove } from '../utils/board';
import { kanbanApi } from './kanban.api';

interface MoveVariables {
  taskId: string;
  input: MoveTaskInput;
}

/**
 * Move o cartão na hora em todas as listagens do projeto (com e sem filtro), desfaz se a API recusar
 * e revalida tudo ao terminar: a Lista, o resumo e Minhas tarefas também mudam.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const projectLists = [...taskKeys.all, 'list', projectId] as const;

  return useMutation({
    mutationFn: ({ taskId, input }: MoveVariables) => kanbanApi.move(taskId, input),
    onMutate: async ({ taskId, input }) => {
      await queryClient.cancelQueries({ queryKey: projectLists });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: projectLists });
      queryClient.setQueriesData<Task[]>({ queryKey: projectLists }, (tasks) =>
        tasks ? applyMove(tasks, taskId, input) : tasks,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, tasks]) => queryClient.setQueryData(key, tasks));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
