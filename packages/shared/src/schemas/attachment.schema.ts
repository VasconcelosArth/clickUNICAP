import { z } from 'zod';

/** Metadados de um anexo de tarefa. O `storageKey` é interno e nunca aparece na API. */
export const attachmentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type Attachment = z.infer<typeof attachmentSchema>;
