import type { TaskDependency } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const ganttApi = {
  projectDependencies: (projectId: string) => api.get<TaskDependency[]>(`/projects/${projectId}/dependencies`),
};
