import { createProjectSchema, type CreateProjectInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, FormField, Input, Modal, Textarea } from '@/components/ui';
import { useCreateProject } from '../api/projects.queries';

const FORM_ID = 'new-project-form';
const DEFAULT_COLOR = '#8470ff';
const emptyToNull = (value: string | null) => value || null;

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProject = useCreateProject();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', description: null, color: DEFAULT_COLOR },
  });

  const close = () => {
    reset();
    createProject.reset();
    onClose();
  };

  const onSubmit = handleSubmit((input) => createProject.mutate(input, { onSuccess: close }));

  return (
    <Modal
      open={open}
      onClose={close}
      title="Novo projeto"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={createProject.isPending}>
            Criar projeto
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
        {createProject.error && <Alert>{createProject.error.message}</Alert>}
        <FormField label="Nome" error={errors.name?.message}>
          {(control) => <Input {...control} maxLength={80} {...register('name')} />}
        </FormField>
        <FormField label="Descrição">
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={2000}
              {...register('description', { setValueAs: emptyToNull })}
            />
          )}
        </FormField>
        <FormField label="Cor" error={errors.color?.message}>
          {(control) => <Input {...control} type="color" className="w-12 h-9 p-0.5" {...register('color')} />}
        </FormField>
      </form>
    </Modal>
  );
}
