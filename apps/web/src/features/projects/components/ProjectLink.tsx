import { TextLink } from '@/components/ui';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { useProject } from '../api/projects.queries';

export function ProjectLink({ projectId }: { projectId: string }) {
  const workspaceId = useActiveWorkspaceId();
  const { data: project } = useProject(projectId);
  return <TextLink to={routes.board(workspaceId, projectId)}>{project?.name ?? 'Projeto'}</TextLink>;
}
