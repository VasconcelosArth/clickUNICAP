import { z } from 'zod';

export const commentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCommentSchema = commentSchema.pick({ body: true });
export const updateCommentSchema = createCommentSchema;

export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
