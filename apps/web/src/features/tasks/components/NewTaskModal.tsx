import {
  createTaskSchema,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type CreateTaskInput,
} from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useCreateTask } from '../api/tasks.queries';

const FORM_ID = 'new-task-form';
const emptyToNull = (value: string | null) => value || null;
const defaultValues: CreateTaskInput = {
  title: '',
  description: null,
  status: 'todo',
  priority: 'medium',
  assigneeId: null,
  startDate: null,
  dueDate: null,
};

interface NewTaskModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function NewTaskModal({ projectId, open, onClose }: NewTaskModalProps) {
  const createTask = useCreateTask(projectId);
  const { data: members = [] } = useWorkspaceMembers();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({ resolver: zodResolver(createTaskSchema), defaultValues });

  const close = () => {
    reset();
    createTask.reset();
    onClose();
  };

  const onSubmit = handleSubmit((input) => createTask.mutate(input, { onSuccess: close }));

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nova tarefa"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={createTask.isPending}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        {createTask.error && (
          <div className="col-span-full">
            <Alert>{createTask.error.message}</Alert>
          </div>
        )}
        <div className="col-span-full">
          <FormField label="Título" error={errors.title?.message}>
            {(control) => <Input {...control} maxLength={200} {...register('title')} />}
          </FormField>
        </div>
        <div className="col-span-full">
          <FormField label="Descrição">
            {(control) => <Textarea {...control} rows={3} {...register('description', { setValueAs: emptyToNull })} />}
          </FormField>
        </div>
        <FormField label="Status">
          {(control) => (
            <Select {...control} {...register('status')}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Prioridade">
          {(control) => (
            <Select {...control} {...register('priority')}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <div className="col-span-full">
          <FormField label="Responsável">
            {(control) => (
              <Select {...control} {...register('assigneeId', { setValueAs: emptyToNull })}>
                <option value="">Sem responsável</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Início" error={errors.startDate?.message}>
          {(control) => <Input {...control} type="date" {...register('startDate', { setValueAs: emptyToNull })} />}
        </FormField>
        <FormField label="Prazo" error={errors.dueDate?.message}>
          {(control) => <Input {...control} type="date" {...register('dueDate', { setValueAs: emptyToNull })} />}
        </FormField>
      </form>
    </Modal>
  );
}
