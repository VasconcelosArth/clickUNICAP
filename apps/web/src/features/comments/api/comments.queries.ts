import type { CreateCommentInput, UpdateCommentInput } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from './comments.api';
import { commentKeys } from './comments.keys';

export function useComments(taskId: string) {
  return useQuery({ queryKey: commentKeys.byTask(taskId), queryFn: () => commentsApi.list(taskId) });
}

function useInvalidateComments(taskId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
}

export function useCreateComment(taskId: string) {
  return useMutation({
    mutationFn: (input: CreateCommentInput) => commentsApi.create(taskId, input),
    onSuccess: useInvalidateComments(taskId),
  });
}

export function useUpdateComment(taskId: string) {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCommentInput }) => commentsApi.update(id, input),
    onSuccess: useInvalidateComments(taskId),
  });
}

export function useDeleteComment(taskId: string) {
  return useMutation({
    mutationFn: (id: string) => commentsApi.remove(id),
    onSuccess: useInvalidateComments(taskId),
  });
}
