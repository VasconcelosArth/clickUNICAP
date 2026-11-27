import type { Attachment, Project } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const attachmentsApi = {
  list: (taskId: string) => api.get<Attachment[]>(`/tasks/${taskId}/attachments`),
  upload: (taskId: string, file: File, onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<Attachment>(`/tasks/${taskId}/attachments`, form, { onProgress });
  },
  /** O download sempre vem como `attachment`: a tela busca o Blob e usa um `blob:` URL. */
  download: (attachmentId: string) => api.getBlob(`/attachments/${attachmentId}/download`),
  remove: (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
  /** Só para saber se o projeto está arquivado (somente leitura). */
  getProject: (projectId: string) => api.get<Project>(`/projects/${projectId}`),
};
