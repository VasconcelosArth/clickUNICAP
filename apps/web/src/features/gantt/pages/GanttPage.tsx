import { useParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingList } from '@/components/ui';
import { useTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { todayIso } from '@/lib/utils';
import { useProjectDependencies } from '../api/gantt.queries';
import { GanttChart } from '../components/GanttChart';
import { taskDates } from '../utils/timeline';

/** Visão Gantt do projeto. Usa os mesmos filtros da URL que o Kanban e a Lista. */
export function GanttPage() {
  const { projectId = '' } = useParams();
  const { filters, hasFilters } = useTaskFilters();
  const tasks = useTasks(projectId, filters);
  const dependencies = useProjectDependencies(projectId);

  const error = tasks.error ?? dependencies.error;
  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={() => {
          void tasks.refetch();
          void dependencies.refetch();
        }}
      />
    );
  }

  if (!tasks.data || !dependencies.data) return <LoadingList />;

  if (tasks.data.length === 0) {
    return hasFilters ? (
      <EmptyState title="Nenhuma tarefa encontrada" description="Nenhuma tarefa corresponde aos filtros." />
    ) : (
      <EmptyState
        title="Nenhuma tarefa neste projeto"
        description="Crie uma tarefa com início e prazo para vê-la aqui."
      />
    );
  }

  const undated = tasks.data.filter((task) => !taskDates(task)).length;

  return (
    <div className="space-y-4">
      {undated > 0 && (
        <p className="text-sm">
          {undated === 1
            ? '1 tarefa está sem datas e aparece no fim da lista.'
            : `${undated} tarefas estão sem datas e aparecem no fim da lista.`}{' '}
          Defina início ou prazo no detalhe da tarefa para que entrem na linha do tempo.
        </p>
      )}
      <GanttChart tasks={tasks.data} dependencies={dependencies.data} today={todayIso()} />
    </div>
  );
}
