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

/** Limite padrão por arquivo (10 MB). O backend aplica `MAX_UPLOAD_BYTES`; a tela usa este valor para avisar antes. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Extensões aceitas no upload. O backend também confere o MIME e a assinatura do conteúdo. */
export const ATTACHMENT_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'txt',
  'csv',
  'docx',
  'xlsx',
  'pptx',
] as const;
