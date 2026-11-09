import { resetPasswordSchema } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, FormField, Input, TextLink } from '@/components/ui';
import { routes } from '@/lib/routes';
import { useResetPassword } from '../api/auth.queries';
import { AuthCard } from '../components/AuthCard';

const newPasswordSchema = resetPasswordSchema.pick({ password: true });
type NewPasswordInput = { password: string };

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '' } });

  const onSubmit = handleSubmit(({ password }) =>
    resetPassword.mutate(
      { token: token ?? '', password },
      { onSuccess: () => navigate(routes.login, { replace: true, state: { passwordReset: true } }) },
    ),
  );

  return (
    <AuthCard title="Criar nova senha" footer={<TextLink to={routes.login}>Voltar para o login</TextLink>}>
      {token ? (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {resetPassword.error && <Alert>{resetPassword.error.message}</Alert>}
          <FormField label="Nova senha" error={errors.password?.message} hint="Pelo menos 8 caracteres">
            {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('password')} />}
          </FormField>
          <Button type="submit" loading={resetPassword.isPending} className="w-full">
            Salvar nova senha
          </Button>
        </form>
      ) : (
        <Alert>Este link de recuperação é inválido. Peça um novo.</Alert>
      )}
    </AuthCard>
  );
}
