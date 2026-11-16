import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ErrorState, FullPageLoader } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { routes, safeNext, withNext } from '@/lib/routes';

/** Só deixa passar quem tem sessão; os outros vão para o login e voltam depois. */
export function RequireAuth() {
  const location = useLocation();
  const { data: user, isPending, error, refetch } = useCurrentUser();

  if (isPending) return <FullPageLoader />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!user) {
    // O perfil é de onde se sai da conta: quem entrar de novo começa pelos workspaces
    const next = location.pathname === routes.profile ? null : `${location.pathname}${location.search}`;
    return <Navigate to={withNext(routes.login, next)} replace />;
  }
  return <Outlet />;
}

/** Login e cadastro: quem já tem sessão segue direto para o app. */
export function GuestOnly() {
  const [params] = useSearchParams();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageLoader />;
  if (user) return <Navigate to={safeNext(params.get('next')) ?? routes.workspaces} replace />;
  return <Outlet />;
}
