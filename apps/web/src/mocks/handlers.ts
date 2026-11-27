import { authHandlers } from '@/features/auth/mocks/auth.handlers';
import { customFieldsHandlers } from '@/features/custom-fields/mocks/custom-fields.handlers';
import { dependenciesHandlers } from '@/features/dependencies/mocks/dependencies.handlers';
import { ganttHandlers } from '@/features/gantt/mocks/gantt.handlers';
import { kanbanHandlers } from '@/features/kanban/mocks/kanban.handlers';
import { notificationsHandlers } from '@/features/notifications/mocks/notifications.handlers';
import { projectsHandlers } from '@/features/projects/mocks/projects.handlers';
import { tasksHandlers } from '@/features/tasks/mocks/tasks.handlers';
import { timeTrackingHandlers } from '@/features/time-tracking/mocks/time-tracking.handlers';
import { workspacesHandlers } from '@/features/workspaces/mocks/workspaces.handlers';
import { subtasksHandlers } from '@/features/subtasks/mocks/subtasks.handlers';
import { commentsHandlers } from '@/features/comments/mocks/comments.handlers';

export const handlers = [
  ...authHandlers,
  ...workspacesHandlers,
  ...projectsHandlers,
  ...tasksHandlers,
  ...kanbanHandlers,
  ...customFieldsHandlers,
  ...subtasksHandlers,
  ...commentsHandlers,
  ...dependenciesHandlers,
  ...ganttHandlers,
  ...notificationsHandlers,
  ...timeTrackingHandlers,
];
