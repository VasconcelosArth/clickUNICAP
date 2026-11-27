import type { CreateSubtaskInput, Subtask, UpdateSubtaskInput } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const subtasksApi = {
  list: (taskId: string) => api.get<Subtask[]>(`/tasks/${taskId}/subtasks`),
  create: (taskId: string, input: CreateSubtaskInput) => api.post<Subtask>(`/tasks/${taskId}/subtasks`, input),
  update: (id: string, input: UpdateSubtaskInput) => api.patch<Subtask>(`/subtasks/${id}`, input),
  remove: (id: string) => api.delete(`/subtasks/${id}`),
};
