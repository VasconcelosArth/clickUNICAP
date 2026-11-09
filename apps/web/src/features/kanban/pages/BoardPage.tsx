import { useParams } from 'react-router-dom';
import { ErrorState, LoadingList } from '@/components/ui';
import { useTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { groupByStatus } from '@/lib/tasks';
import { KanbanColumn } from '../components/KanbanColumn';

export function BoardPage() {
  const { projectId = '' } = useParams();
  const { filters } = useTaskFilters();
  const { data: tasks, isPending, error, refetch } = useTasks(projectId, filters);

  if (isPending) return <LoadingList />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {groupByStatus(tasks).map((group) => (
        <KanbanColumn key={group.status} group={group} />
      ))}
    </div>
  );
}
