import { updateTaskSchema, type Task, type UpdateTaskInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, ConfirmAction, FormField, Input, Textarea } from '@/components/ui';
import { useDeleteTask, useUpdateTask } from '../api/tasks.queries';
import { TaskProperties } from './TaskProperties';
import { TaskSlots } from './TaskSlots';

interface TaskDetailFormProps {
  task: Task;
  onDeleted: () => void;
}

const emptyToNull = (value: string | null) => value || null;

function toFormValues(task: Task): UpdateTaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    startDate: task.startDate,
    dueDate: task.dueDate,
  };
}

/** O PATCH recebe só o que mudou, para não sobrescrever a edição de outra pessoa nos demais campos. */
function changedFields(
  values: UpdateTaskInput,
  dirtyFields: Partial<Record<keyof UpdateTaskInput, unknown>>,
): UpdateTaskInput {
  const changed = Object.entries(values).filter(([name]) => dirtyFields[name as keyof UpdateTaskInput]);
  return Object.fromEntries(changed) as UpdateTaskInput;
}

/** As alterações só vão para a API ao clicar em Salvar. */
export function TaskDetailForm({ task, onDeleted }: TaskDetailFormProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const form = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: toFormValues(task),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields, isDirty },
  } = form;
  const error = updateTask.error ?? deleteTask.error;

  const onSubmit = handleSubmit((values) =>
    updateTask.mutate(
      { id: task.id, input: changedFields(values, dirtyFields) },
      { onSuccess: (saved) => reset(toFormValues(saved)) },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-12 gap-6">
      {error && (
        <div className="col-span-full">
          <Alert>{error.message}</Alert>
        </div>
      )}
      {updateTask.isSuccess && !isDirty && (
        <div className="col-span-full">
          <Alert tone="success">Alterações salvas.</Alert>
        </div>
      )}
      <div className="col-span-full lg:col-span-8 min-w-0 space-y-4">
        <FormField label="Título" error={errors.title?.message}>
          {(control) => <Input {...control} maxLength={200} className="text-xl font-bold" {...register('title')} />}
        </FormField>
        <FormField label="Descrição">
          {(control) => <Textarea {...control} rows={5} {...register('description', { setValueAs: emptyToNull })} />}
        </FormField>
        <TaskSlots region="main" task={task} />
        <TaskSlots region="attachments" task={task} />
        <TaskSlots region="activity" task={task} />
      </div>
      <div className="col-span-full lg:col-span-4 min-w-0">
        <TaskProperties form={form} />
        <TaskSlots region="sidebar" task={task} />
      </div>
      <div className="col-span-full flex flex-wrap items-start justify-between gap-3 border-t border-gray-100 dark:border-gray-700/60 pt-4">
        <ConfirmAction
          label="Excluir tarefa"
          question="Excluir esta tarefa? Não dá para desfazer."
          confirmLabel="Excluir"
          pending={deleteTask.isPending}
          onConfirm={() => deleteTask.mutate(task.id, { onSuccess: onDeleted })}
          triggerProps={{ variant: 'secondary', className: 'text-red-800 dark:text-red-400' }}
        />
        <Button type="submit" loading={updateTask.isPending} disabled={!isDirty}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
