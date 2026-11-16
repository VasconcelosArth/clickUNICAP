import type { TaskFilters, TaskStatus } from '@clickunicap/shared';
import { useMemo, type ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingList, Page, PageHeader } from '@/components/ui';
import { TaskFiltersBar, useMyTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { MyTasksTable } from '../components/MyTasksTable';
import { groupByDue } from '../utils/groupByDue';

/** Minhas tarefas mostra o que ainda está por fazer: as concluídas saem da lista. */
const PENDING: TaskStatus[] = ['todo', 'in_progress'];

interface MyTasksPageProps {
  /** O nome do projeto vem da feature `projects`, que o app/ injeta (features não se importam). */
  renderProjectLink: (projectId: string) => ReactNode;
}

export function MyTasksPage({ renderProjectLink }: MyTasksPageProps) {
  const { filters: urlFilters, hasFilters } = useTaskFilters();
  // O responsável é sempre quem está logado: um `assigneeId` na URL não se aplica aqui
  const filters = useMemo<TaskFilters>(
    () => ({ search: urlFilters.search, priority: urlFilters.priority, status: PENDING }),
    [urlFilters.search, urlFilters.priority],
  );
  const { data: tasks, isPending, error, refetch } = useMyTasks(filters);

  return (
    <Page>
      <PageHeader title="Minhas tarefas" />
      <TaskFiltersBar showAssignee={false} />
      {isPending ? (
        <LoadingList />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente com você'}
          description={
            hasFilters
              ? 'Tente outro termo de busca ou outra prioridade.'
              : 'Quando alguém atribuir uma tarefa a você, ela aparece aqui.'
          }
        />
      ) : (
        <div className="space-y-6">
          {groupByDue(tasks).map((group) => (
            <MyTasksTable key={group.id} group={group} renderProjectLink={renderProjectLink} />
          ))}
        </div>
      )}
    </Page>
  );
}
