import { z } from 'zod';

export const subtaskSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  isDone: z.boolean(),
  position: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSubtaskSchema = subtaskSchema.pick({ title: true });

export const updateSubtaskSchema = subtaskSchema
  .pick({ title: true, isDone: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Informe ao menos um campo' });

export type Subtask = z.infer<typeof subtaskSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
