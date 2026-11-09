import { updateProfileSchema, type UpdateProfileInput, type User } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Avatar, Button, Card, FormField, Input } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useUpdateProfile } from '../api/auth.queries';

export function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name, avatarUrl: user.avatarUrl },
  });

  return (
    <Card className="p-5 mb-6">
      <form onSubmit={handleSubmit((input) => updateProfile.mutate(input))} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Na plataforma desde {formatDate(user.createdAt)}</p>
          </div>
        </div>
        {updateProfile.error && <Alert>{updateProfile.error.message}</Alert>}
        {updateProfile.isSuccess && <Alert tone="success">Alterações salvas.</Alert>}
        <FormField label="Nome" error={errors.name && 'Informe seu nome'}>
          {(control) => <Input {...control} autoComplete="name" maxLength={120} {...register('name')} />}
        </FormField>
        <FormField label="Endereço da foto" error={errors.avatarUrl && 'Informe um endereço válido'}>
          {(control) => (
            <Input
              {...control}
              type="url"
              placeholder="https://..."
              {...register('avatarUrl', { setValueAs: (value: string | null) => value || null })}
            />
          )}
        </FormField>
        <FormField label="E-mail">{(control) => <Input {...control} value={user.email} disabled readOnly />}</FormField>
        <div className="flex justify-end">
          <Button type="submit" loading={updateProfile.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Card>
  );
}
