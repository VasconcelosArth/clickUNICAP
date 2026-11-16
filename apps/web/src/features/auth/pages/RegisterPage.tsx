import { registerSchema, type RegisterInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, FormField, Input, TextLink } from '@/components/ui';
import { routes, safeNext, withNext } from '@/lib/routes';
import { useRegister } from '../api/auth.queries';
import { AuthCard } from '../components/AuthCard';

export function RegisterPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const createAccount = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((input) =>
    createAccount.mutate(input, { onSuccess: () => navigate(next ?? routes.workspaces, { replace: true }) }),
  );

  return (
    <AuthCard
      title="Criar conta"
      footer={
        <>
          Já tem conta? <TextLink to={withNext(routes.login, next)}>Entrar</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {createAccount.error && <Alert>{createAccount.error.message}</Alert>}
        <FormField label="Nome" error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="name" maxLength={120} {...register('name')} />}
        </FormField>
        <FormField label="E-mail" error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              {...register('email')}
            />
          )}
        </FormField>
        <FormField label="Senha" error={errors.password?.message} hint="Pelo menos 8 caracteres">
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('password')} />}
        </FormField>
        <Button type="submit" loading={createAccount.isPending} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthCard>
  );
}
