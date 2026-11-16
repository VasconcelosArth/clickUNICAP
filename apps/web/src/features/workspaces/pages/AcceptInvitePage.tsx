import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, LinkButton, PageTitle, TextLink } from '@/components/ui';
import { useLogout } from '@/hooks/useLogout';
import { routes } from '@/lib/routes';
import { useAcceptInvite } from '../api/workspaces.queries';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const acceptInvite = useAcceptInvite();
  const logout = useLogout();
  const accepted = acceptInvite.data;

  return (
    <>
      <div className="mb-6">
        <PageTitle>Convite para workspace</PageTitle>
      </div>
      <Card className="p-5 space-y-4">
        {!token && <Alert>Convite inválido ou expirado</Alert>}
        {token && accepted && (
          <>
            <Alert tone="success">Pronto, você entrou em {accepted.name}.</Alert>
            <LinkButton to={routes.workspace(accepted.id)} className="w-full">
              Abrir workspace
            </LinkButton>
          </>
        )}
        {token && !accepted && (
          <>
            {acceptInvite.error && <Alert>{acceptInvite.error.message}</Alert>}
            <p className="text-sm">
              Você recebeu um convite por e-mail. Aceite usando a conta para a qual ele foi enviado.
            </p>
            <Button className="w-full" loading={acceptInvite.isPending} onClick={() => acceptInvite.mutate(token)}>
              Aceitar convite
            </Button>
            {acceptInvite.error && (
              <Button variant="secondary" className="w-full" loading={logout.isPending} onClick={() => logout.mutate()}>
                Entrar com outra conta
              </Button>
            )}
          </>
        )}
      </Card>
      <p className="text-sm text-center mt-4">
        <TextLink to={routes.workspaces}>Ver meus workspaces</TextLink>
      </p>
    </>
  );
}
