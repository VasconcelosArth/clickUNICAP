import { createTimeEntrySchema, MAX_TIME_ENTRY_MINUTES, type CreateTimeEntryInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, FormField, Input } from '@/components/ui';
import { useCreateTimeEntry } from '../api/time-tracking.queries';

/**
 * Lançamento manual: o tempo termina agora. Fica dentro do formulário da tarefa, então não é um <form> próprio:
 * o botão e o Enter enviam só este lançamento, e nada espera o Salvar do modal.
 */
export function ManualEntryForm({ taskId }: { taskId: string }) {
  const create = useCreateTimeEntry();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<CreateTimeEntryInput>({ resolver: zodResolver(createTimeEntrySchema) });

  // Não use reset(): sem valores, ele chama .reset() no <form> mais próximo, que é o da tarefa
  const clear = () => {
    resetField('minutes');
    resetField('note');
  };
  const submit = handleSubmit((input) => create.mutate({ taskId, input }, { onSuccess: clear }));
  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void submit();
  };

  return (
    <div className="space-y-3 border-t border-gray-100 dark:border-gray-700/60 pt-4">
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Lançar tempo</h3>
      {create.error && <Alert>{create.error.message}</Alert>}
      <FormField label="Minutos" error={errors.minutes?.message}>
        {(control) => (
          <Input
            {...control}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TIME_ENTRY_MINUTES}
            onKeyDown={submitOnEnter}
            {...register('minutes', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField label="Nota (opcional)" error={errors.note?.message}>
        {(control) => (
          <Input
            {...control}
            maxLength={500}
            onKeyDown={submitOnEnter}
            {...register('note', { setValueAs: (value: string) => value.trim() || undefined })}
          />
        )}
      </FormField>
      <Button variant="secondary" className="w-full" loading={create.isPending} onClick={() => void submit()}>
        Lançar tempo
      </Button>
    </div>
  );
}
