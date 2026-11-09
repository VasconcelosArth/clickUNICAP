import { Navigate, useLocation, useParams } from 'react-router-dom';
import { ErrorState, LoadingList, Page } from '@/components/ui';
import { useProjects } from '@/features/projects';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';

/** O workspace abre no primeiro projeto; sem projeto, na lista para criar um. */
export function WorkspaceIndexRedirect() {
  const workspaceId = useActiveWorkspaceId();
  const { data: projects, isPending, error, refetch } = useProjects();

  if (isPending) {
    return (
      <Page>
        <LoadingList />
      </Page>
    );
  }
  if (error) {
    return (
      <Page>
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </Page>
    );
  }

  const first = projects[0];
  return <Navigate to={first ? routes.board(workspaceId, first.id) : routes.projects(workspaceId)} replace />;
}

export function ProjectIndexRedirect() {
  const workspaceId = useActiveWorkspaceId();
  const { projectId = '' } = useParams();
  const { search } = useLocation();
  return <Navigate to={{ pathname: routes.board(workspaceId, projectId), search }} replace />;
}
