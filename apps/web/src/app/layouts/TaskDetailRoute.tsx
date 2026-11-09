import { ProjectLink } from '@/features/projects';
import { TaskDetailModal } from '@/features/tasks';

export function TaskDetailRoute() {
  return <TaskDetailModal renderProjectLink={(projectId) => <ProjectLink projectId={projectId} />} />;
}
