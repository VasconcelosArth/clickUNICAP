import { useState } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { Badge, Button, ErrorState, LoadingList, Page, PageHeader, PlusIcon } from '@/components/ui';
import { useProject } from '@/features/projects';
import { NewTaskModal, TaskFiltersBar, TaskSummaryCards } from '@/features/tasks';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function ProjectViewTabs({ projectId }: { projectId: string }) {
  const workspaceId = useActiveWorkspaceId();
  const { search } = useLocation();
  const tabs = [
    { label: 'Kanban', pathname: routes.board(workspaceId, projectId) },
    { label: 'Lista', pathname: routes.list(workspaceId, projectId) },
  ];

  return (
    <nav aria-label="Visões do projeto" className="flex gap-6 border-b border-gray-200 dark:border-gray-700/60 mb-6">
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={{ pathname: tab.pathname, search }}
          className={({ isActive }) =>
            cn(
              'text-sm font-medium pb-3 border-b-2 -mb-px',
              isActive
                ? 'text-violet-700 dark:text-violet-400 border-violet-500'
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Cabeçalho comum das visões do projeto: resumo, abas e filtros. */
export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const { data: project, isPending, error, refetch } = useProject(projectId);
  const [creating, setCreating] = useState(false);

  if (isPending) {
    return (
      <Page wide>
        <LoadingList />
      </Page>
    );
  }
  if (error) {
    return (
      <Page wide>
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </Page>
    );
  }

  const archived = !!project.archivedAt;

  return (
    <Page wide>
      <PageHeader
        title={project.name}
        actions={
          archived ? (
            <Badge>Arquivado</Badge>
          ) : (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              Nova tarefa
            </Button>
          )
        }
      />
      <TaskSummaryCards projectId={projectId} />
      <ProjectViewTabs projectId={projectId} />
      <TaskFiltersBar key={projectId} />
      <Outlet />
      <NewTaskModal projectId={projectId} open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
