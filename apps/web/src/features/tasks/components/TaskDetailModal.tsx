import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingList, Modal } from '@/components/ui';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { routes } from '@/lib/routes';
import { useTask } from '../api/tasks.queries';
import { TaskDetailForm } from './TaskDetailForm';

interface TaskDetailModalProps {
  /** O app injeta o link do projeto, porque uma feature não importa outra. */
  renderProjectLink: (projectId: string) => ReactNode;
}

export function TaskDetailModal({ renderProjectLink }: TaskDetailModalProps) {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const openedFromScreen = !!(useLocation().state as { backgroundLocation?: unknown } | null)?.backgroundLocation;
  const workspaceId = useActiveWorkspaceId();
  const { data: task, isPending, error, refetch } = useTask(taskId);
  // O formulário só pode nascer com as opções de responsável, senão o seletor perde o valor salvo
  const { isLoading: loadingMembers } = useWorkspaceMembers();

  const close = () => {
    if (openedFromScreen) navigate(-1);
    else if (task) navigate(routes.board(workspaceId, task.projectId), { replace: true });
    else navigate(routes.workspace(workspaceId), { replace: true });
  };

  return (
    <Modal open onClose={close} size="xl" title={task ? renderProjectLink(task.projectId) : 'Tarefa'}>
      {(isPending || loadingMembers) && <LoadingList rows={4} />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {task && !loadingMembers && <TaskDetailForm key={task.id} task={task} onDeleted={close} />}
    </Modal>
  );
}
