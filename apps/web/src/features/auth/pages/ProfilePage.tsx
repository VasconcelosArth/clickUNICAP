import { Alert, Button, Card, ErrorState, LoadingList, PageTitle } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLogout } from '@/hooks/useLogout';
import { ProfileForm } from '../components/ProfileForm';

export function ProfilePage() {
  const { data: user, isPending, error, refetch } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-2xl">
      <div className="mb-8">
        <PageTitle>Perfil</PageTitle>
      </div>
      {isPending && <LoadingList rows={2} />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {user && (
        <>
          <ProfileForm user={user} />
          <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">Sair da conta</p>
              <p className="text-sm">Encerra a sessão neste navegador.</p>
            </div>
            <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
              Sair
            </Button>
            {logout.error && (
              <div className="w-full">
                <Alert>{logout.error.message}</Alert>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
