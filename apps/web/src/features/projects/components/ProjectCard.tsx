import type { Project } from '@clickunicap/shared';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';

interface ProjectCardProps {
  project: Project;
  canArchive: boolean;
  pending: boolean;
  onToggleArchived: () => void;
}

export function ProjectCard({ project, canArchive, pending, onToggleArchived }: ProjectCardProps) {
  const workspaceId = useActiveWorkspaceId();
  const archived = !!project.archivedAt;

  return (
    <Card className="col-span-full sm:col-span-6 xl:col-span-4 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="w-3 h-3 rounded-full shrink-0 bg-gray-400"
          style={project.color ? { backgroundColor: project.color } : undefined}
        />
        <Link
          to={routes.board(workspaceId, project.id)}
          className="grow min-w-0 truncate text-base font-semibold text-gray-800 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
        >
          {project.name}
        </Link>
        {archived && <Badge>Arquivado</Badge>}
      </div>
      <p className="text-sm grow">{project.description ?? 'Sem descrição'}</p>
      {canArchive && (
        <div className="flex justify-end border-t border-gray-100 dark:border-gray-700/60 pt-3">
          <Button
            variant="secondary"
            loading={pending}
            aria-label={`${archived ? 'Restaurar' : 'Arquivar'} ${project.name}`}
            onClick={onToggleArchived}
          >
            {archived ? 'Restaurar' : 'Arquivar'}
          </Button>
        </div>
      )}
    </Card>
  );
}
