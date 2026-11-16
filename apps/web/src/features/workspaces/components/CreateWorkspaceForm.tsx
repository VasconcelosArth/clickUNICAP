import { createWorkspaceSchema, type CreateWorkspaceInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, FormField, Input } from '@/components/ui';
import { routes } from '@/lib/routes';
import { useCreateWorkspace } from '../api/workspaces.queries';

export function CreateWorkspaceForm() {
  const navigate = useNavigate();
  const createWorkspace = useCreateWorkspace();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({ resolver: zodResolver(createWorkspaceSchema), defaultValues: { name: '' } });

  const onSubmit = handleSubmit((input) =>
    createWorkspace.mutate(input, { onSuccess: (workspace) => navigate(routes.workspace(workspace.id)) }),
  );

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Criar workspace</h2>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {createWorkspace.error && <Alert>{createWorkspace.error.message}</Alert>}
        <div className="flex flex-wrap items-start gap-3">
          <div className="grow basis-56">
            <FormField label="Nome" error={errors.name?.message}>
              {(control) => <Input {...control} maxLength={80} placeholder="Ex.: Time de TCC" {...register('name')} />}
            </FormField>
          </div>
          <Button type="submit" loading={createWorkspace.isPending} className="mt-7">
            Criar
          </Button>
        </div>
      </form>
    </Card>
  );
}
