import { ProjectLink } from '@/features/projects';
import { MyTasksPage } from '@/features/task-list';

export function MyTasksRoute() {
  return <MyTasksPage renderProjectLink={(projectId) => <ProjectLink projectId={projectId} />} />;
}
