import { useParams } from 'react-router-dom';
import { ErrorState, LoadingList } from '@/components/ui';
import { useTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { groupByStatus } from '@/lib/tasks';
import { TaskGroupTable } from '../components/TaskGroupTable';

export function TaskListPage() {
  const { projectId = '' } = useParams();
  const { filters } = useTaskFilters();
  const { data: tasks, isPending, error, refetch } = useTasks(projectId, filters);

  if (isPending) return <LoadingList />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      {groupByStatus(tasks).map((group) => (
        <TaskGroupTable key={group.status} group={group} />
      ))}
    </div>
  );
}
