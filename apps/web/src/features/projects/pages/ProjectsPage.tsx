import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  LoadingList,
  Page,
  PageHeader,
  PlusIcon,
} from '@/components/ui';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useProjects, useSetProjectArchived } from '../api/projects.queries';
import { NewProjectModal } from '../components/NewProjectModal';
import { ProjectCard } from '../components/ProjectCard';

export function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const showArchived = params.get('archived') === '1';
  const [creating, setCreating] = useState(false);
  const { isAdmin } = useCurrentWorkspace();
  const { data: projects, isPending, error, refetch } = useProjects(showArchived);
  const setArchived = useSetProjectArchived();

  const toggleShowArchived = () => setParams(showArchived ? {} : { archived: '1' }, { replace: true });
  const newProjectButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      Novo projeto
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Projetos"
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer mr-2">
              <Checkbox checked={showArchived} onChange={toggleShowArchived} />
              Mostrar arquivados
            </label>
            {newProjectButton}
          </>
        }
      />
      {setArchived.error && (
        <div className="mb-6">
          <Alert>{setArchived.error.message}</Alert>
        </div>
      )}
      {isPending && <LoadingList />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {projects?.length === 0 && (
        <Card>
          <EmptyState
            title="Nenhum projeto por aqui"
            description="Crie um projeto para começar a organizar as tarefas."
            action={newProjectButton}
          />
        </Card>
      )}
      {projects && projects.length > 0 && (
        <div className="grid grid-cols-12 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canArchive={isAdmin}
              pending={setArchived.isPending && setArchived.variables.projectId === project.id}
              onToggleArchived={() => setArchived.mutate({ projectId: project.id, archived: !project.archivedAt })}
            />
          ))}
        </div>
      )}
      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
