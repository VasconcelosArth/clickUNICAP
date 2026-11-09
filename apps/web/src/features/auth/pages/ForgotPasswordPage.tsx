import { forgotPasswordSchema, type ForgotPasswordInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, FormField, Input, TextLink } from '@/components/ui';
import { routes } from '@/lib/routes';
import { useForgotPassword } from '../api/auth.queries';
import { AuthCard } from '../components/AuthCard';

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  return (
    <AuthCard
      title="Esqueci a senha"
      description="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      footer={<TextLink to={routes.login}>Voltar para o login</TextLink>}
    >
      {forgotPassword.isSuccess ? (
        <Alert tone="success">Se este e-mail tiver uma conta, o link chegará em instantes.</Alert>
      ) : (
        <form onSubmit={handleSubmit((input) => forgotPassword.mutate(input))} noValidate className="space-y-4">
          {forgotPassword.error && <Alert>{forgotPassword.error.message}</Alert>}
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
          <Button type="submit" loading={forgotPassword.isPending} className="w-full">
            Enviar link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
