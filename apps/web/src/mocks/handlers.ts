import { authHandlers } from '@/features/auth/mocks/auth.handlers';
import { projectsHandlers } from '@/features/projects/mocks/projects.handlers';
import { tasksHandlers } from '@/features/tasks/mocks/tasks.handlers';
import { workspacesHandlers } from '@/features/workspaces/mocks/workspaces.handlers';

export const handlers = [...authHandlers, ...workspacesHandlers, ...projectsHandlers, ...tasksHandlers];
