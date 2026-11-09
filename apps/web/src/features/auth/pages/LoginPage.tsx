import { loginSchema, type LoginInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, FormField, Input, TextLink } from '@/components/ui';
import { routes, safeNext, withNext } from '@/lib/routes';
import { useLogin } from '../api/auth.queries';
import { AuthCard } from '../components/AuthCard';

export function LoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const passwordReset = (useLocation().state as { passwordReset?: boolean } | null)?.passwordReset;
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit((input) =>
    login.mutate(input, { onSuccess: () => navigate(next ?? routes.workspaces, { replace: true }) }),
  );

  return (
    <AuthCard
      title="Entrar"
      footer={
        <>
          Ainda não tem conta? <TextLink to={withNext(routes.register, next)}>Criar conta</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {passwordReset && <Alert tone="success">Senha alterada. Entre com a nova senha.</Alert>}
        {login.error && <Alert>{login.error.message}</Alert>}
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
        <FormField label="Senha" error={errors.password?.message}>
          {(control) => (
            <Input {...control} type="password" autoComplete="current-password" {...register('password')} />
          )}
        </FormField>
        <div className="text-right">
          <TextLink to={routes.forgotPassword} className="text-xs">
            Esqueci a senha
          </TextLink>
        </div>
        <Button type="submit" loading={login.isPending} className="w-full">
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
