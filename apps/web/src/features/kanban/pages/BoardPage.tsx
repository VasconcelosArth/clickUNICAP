import { useOutletContext, useParams } from 'react-router-dom';
import { ErrorState, LoadingList } from '@/components/ui';
import { useTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { KanbanBoard } from '../components/KanbanBoard';

/** O ProjectLayout avisa se o projeto está arquivado. Fora dele (nos testes), o quadro é editável. */
interface ProjectOutletContext {
  archived?: boolean;
}

export function BoardPage() {
  const { projectId = '' } = useParams();
  const { filters, hasFilters } = useTaskFilters();
  const context = useOutletContext<ProjectOutletContext | undefined>();
  const { data: tasks, isPending, error, refetch } = useTasks(projectId, filters);

  if (isPending) return <LoadingList />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return <KanbanBoard projectId={projectId} tasks={tasks} filtered={hasFilters} readOnly={!!context?.archived} />;
}
