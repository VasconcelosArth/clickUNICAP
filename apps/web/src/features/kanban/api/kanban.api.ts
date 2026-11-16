import type { MoveTaskInput, Task } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const kanbanApi = {
  move: (taskId: string, input: MoveTaskInput) => api.post<Task>(`/tasks/${taskId}/move`, input),
};
