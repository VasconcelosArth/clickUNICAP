import type { TaskFilters } from '@clickunicap/shared';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string, filters: TaskFilters) => [...taskKeys.all, 'list', projectId, filters] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
};
