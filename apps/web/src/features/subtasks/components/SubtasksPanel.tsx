import { createSubtaskSchema, type CreateSubtaskInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { Alert, Button, ErrorState, Input, Skeleton } from '@/components/ui';
import { useCreateSubtask, useSubtasks } from '../api/subtasks.queries';
import { SubtaskItem } from './SubtaskItem';

export function SubtasksPanel({ taskId }: TaskSlotProps) {
  const { data: subtasks, isPending, error, refetch } = useSubtasks(taskId);
  const create = useCreateSubtask(taskId);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof createSubtaskSchema>, unknown, CreateSubtaskInput>({
    resolver: zodResolver(createSubtaskSchema),
    defaultValues: { title: '' },
  });

  const total = subtasks?.length ?? 0;
  const done = subtasks?.filter((subtask) => subtask.isDone).length ?? 0;

  // Fica dentro do <form> da tarefa (slot): o envio é pelo clique ou pelo Enter, sem um <form> aninhado.
  const add = handleSubmit((input) => create.mutate(input, { onSuccess: () => reset() }));

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">Subtarefas</h3>

      {isPending && (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}

      {subtasks && total === 0 && <p className="text-sm mb-3">Nenhuma subtarefa ainda.</p>}
      {subtasks && total > 0 && (
        <>
          <div className="flex items-center gap-3 mb-2">
            <div
              role="progressbar"
              aria-label="Progresso das subtarefas"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="h-1.5 grow rounded-full bg-gray-100 dark:bg-gray-700/60"
            >
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
              {done}/{total}
            </span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 mb-3">
            {subtasks.map((subtask) => (
              <SubtaskItem key={subtask.id} subtask={subtask} />
            ))}
          </ul>
        </>
      )}

      {create.error && (
        <div className="mb-3">
          <Alert>{create.error.message}</Alert>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          aria-label="Nova subtarefa"
          placeholder="Adicionar subtarefa"
          maxLength={200}
          aria-invalid={errors.title ? true : undefined}
          {...register('title')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void add();
            }
          }}
        />
        <Button
          variant="secondary"
          loading={create.isPending}
          disabled={!watch('title').trim()}
          onClick={() => void add()}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
