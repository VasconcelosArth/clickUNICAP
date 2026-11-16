import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ErrorState, FullPageLoader } from '@/components/ui';
import { useWorkspace } from '@/hooks/useCurrentWorkspace';
import { ApiError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { NotFoundPage } from '../pages/NotFoundPage';

/** Só renderiza a tela quando o workspace da URL já é o ativo, porque as requisições levam o X-Workspace-Id dele. */
export function WorkspaceGate() {
  const { workspaceId = '' } = useParams();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const { isPending, error, refetch } = useWorkspace(workspaceId);

  useEffect(() => setActiveWorkspace(workspaceId), [workspaceId, setActiveWorkspace]);

  if (isPending || activeWorkspaceId !== workspaceId) return <FullPageLoader />;
  if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) return <NotFoundPage />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  return <Outlet />;
}
