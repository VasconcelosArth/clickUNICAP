export const attachmentKeys = {
  all: ['attachments'] as const,
  byTask: (taskId: string) => [...attachmentKeys.all, 'task', taskId] as const,
  /** Conteúdo do arquivo, só para o preview (não fica em cache depois de fechar). */
  file: (attachmentId: string) => [...attachmentKeys.all, 'file', attachmentId] as const,
};
