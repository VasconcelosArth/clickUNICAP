import { Card, EmptyState, ErrorState, LoadingList, PageTitle, TextLink } from '@/components/ui';
import { routes } from '@/lib/routes';
import { useMyWorkspaces } from '../api/workspaces.queries';
import { CreateWorkspaceForm } from '../components/CreateWorkspaceForm';
import { WorkspaceList } from '../components/WorkspaceList';

export function WorkspacesPage() {
  const { data: workspaces, isPending, error, refetch } = useMyWorkspaces();

  return (
    <>
      <div className="mb-6">
        <PageTitle>Seus workspaces</PageTitle>
      </div>
      {isPending && (
        <div className="mb-6">
          <LoadingList rows={2} />
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {workspaces && workspaces.length > 0 && <WorkspaceList workspaces={workspaces} />}
      {workspaces?.length === 0 && (
        <Card className="mb-6">
          <EmptyState
            title="Você ainda não tem um workspace"
            description="Crie o primeiro abaixo ou abra o convite que recebeu por e-mail."
          />
        </Card>
      )}
      <CreateWorkspaceForm />
      <p className="text-sm text-center mt-4">
        <TextLink to={routes.profile}>Meu perfil</TextLink>
      </p>
    </>
  );
}
