import type { CreateTaskDependencyInput, TaskDependencies, TaskDependency } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const dependenciesApi = {
  listForTask: (taskId: string) => api.get<TaskDependencies>(`/tasks/${taskId}/dependencies`),
  create: (taskId: string, input: CreateTaskDependencyInput) =>
    api.post<TaskDependency>(`/tasks/${taskId}/dependencies`, input),
  remove: (taskId: string, dependsOnTaskId: string) => api.delete(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`),
};
