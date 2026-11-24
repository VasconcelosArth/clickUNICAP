import { authHandlers } from '@/features/auth/mocks/auth.handlers';
import { kanbanHandlers } from '@/features/kanban/mocks/kanban.handlers';
import { projectsHandlers } from '@/features/projects/mocks/projects.handlers';
import { tasksHandlers } from '@/features/tasks/mocks/tasks.handlers';
import { workspacesHandlers } from '@/features/workspaces/mocks/workspaces.handlers';
import { subtasksHandlers } from '@/features/subtasks/mocks/subtasks.handlers';
import { commentsHandlers } from '@/features/comments/mocks/comments.handlers';

export const handlers = [
  ...authHandlers,
  ...workspacesHandlers,
  ...projectsHandlers,
  ...tasksHandlers,
  ...kanbanHandlers,
  ...subtasksHandlers,
  ...commentsHandlers,
];
