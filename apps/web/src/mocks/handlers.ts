import { authHandlers } from '@/features/auth/mocks/auth.handlers';
import { dependenciesHandlers } from '@/features/dependencies/mocks/dependencies.handlers';
import { ganttHandlers } from '@/features/gantt/mocks/gantt.handlers';
import { kanbanHandlers } from '@/features/kanban/mocks/kanban.handlers';
import { projectsHandlers } from '@/features/projects/mocks/projects.handlers';
import { tasksHandlers } from '@/features/tasks/mocks/tasks.handlers';
import { workspacesHandlers } from '@/features/workspaces/mocks/workspaces.handlers';

export const handlers = [
  ...authHandlers,
  ...workspacesHandlers,
  ...projectsHandlers,
  ...tasksHandlers,
  ...kanbanHandlers,
  ...dependenciesHandlers,
  ...ganttHandlers,
];
