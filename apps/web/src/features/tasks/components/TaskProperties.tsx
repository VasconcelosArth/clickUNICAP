import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type UpdateTaskInput,
} from '@clickunicap/shared';
import type { UseFormReturn } from 'react-hook-form';
import { FormField, Input, SectionLabel, Select, StatusBadge } from '@/components/ui';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

const emptyToNull = (value: string | null) => value || null;

export function TaskProperties({ form }: { form: UseFormReturn<UpdateTaskInput> }) {
  const { data: members = [] } = useWorkspaceMembers();
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const status = watch('status');

  return (
    <div className="space-y-4">
      <SectionLabel>Propriedades</SectionLabel>
      <FormField label="Status">
        {(control) => (
          <Select {...control} {...register('status')}>
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {status && <StatusBadge status={status} />}
      <FormField label="Prioridade">
        {(control) => (
          <Select {...control} {...register('priority')}>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {TASK_PRIORITY_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
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
      <FormField label="Início" error={errors.startDate?.message}>
        {(control) => <Input {...control} type="date" {...register('startDate', { setValueAs: emptyToNull })} />}
      </FormField>
      <FormField label="Prazo" error={errors.dueDate?.message}>
        {(control) => <Input {...control} type="date" {...register('dueDate', { setValueAs: emptyToNull })} />}
      </FormField>
    </div>
  );
}
