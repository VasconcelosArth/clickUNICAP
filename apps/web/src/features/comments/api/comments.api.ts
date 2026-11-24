import type { Comment, CreateCommentInput, UpdateCommentInput } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const commentsApi = {
  list: (taskId: string) => api.get<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, input: CreateCommentInput) => api.post<Comment>(`/tasks/${taskId}/comments`, input),
  update: (id: string, input: UpdateCommentInput) => api.patch<Comment>(`/comments/${id}`, input),
  remove: (id: string) => api.delete(`/comments/${id}`),
};
