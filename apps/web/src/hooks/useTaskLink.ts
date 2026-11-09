import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { useActiveWorkspaceId } from './useCurrentWorkspace';

/** Link para o detalhe da tarefa, que abre como modal sobre a tela atual. */
export function useTaskLink() {
  const workspaceId = useActiveWorkspaceId();
  const location = useLocation();
  return useCallback(
    (taskId: string) => ({ to: routes.task(workspaceId, taskId), state: { backgroundLocation: location } }),
    [workspaceId, location],
  );
}
