import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const tasksApi = {
  list: (projectId: string, filters: TaskFilters) => api.get<Task[]>(`/projects/${projectId}/tasks`, filters),
  get: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),
  create: (projectId: string, input: CreateTaskInput) => api.post<Task>(`/projects/${projectId}/tasks`, input),
  update: (taskId: string, input: UpdateTaskInput) => api.patch<Task>(`/tasks/${taskId}`, input),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
};
