import { inviteMemberSchema, MEMBER_ROLE_LABELS, MEMBER_ROLES, type InviteMemberInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Alert, Button, Card, FormField, Input, Select } from '@/components/ui';
import { useInviteMember } from '../api/workspaces.queries';

export function InviteMemberForm() {
  const inviteMember = useInviteMember();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof inviteMemberSchema>, unknown, InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const onSubmit = handleSubmit((input) => inviteMember.mutate(input, { onSuccess: () => reset() }));

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Convidar por e-mail</h2>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {inviteMember.error && <Alert>{inviteMember.error.message}</Alert>}
        {inviteMember.isSuccess && <Alert tone="success">Convite enviado.</Alert>}
        <div className="flex flex-wrap items-start gap-3">
          <div className="grow basis-64">
            <FormField label="E-mail" error={errors.email?.message}>
              {(control) => <Input {...control} type="email" placeholder="colega@exemplo.com" {...register('email')} />}
            </FormField>
          </div>
          <div className="basis-44">
            <FormField label="Papel">
              {(control) => (
                <Select {...control} {...register('role')}>
                  {MEMBER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {MEMBER_ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
          <Button type="submit" loading={inviteMember.isPending} className="mt-7">
            Enviar convite
          </Button>
        </div>
      </form>
    </Card>
  );
}
