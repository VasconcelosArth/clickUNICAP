import type { Attachment } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveFile } from '../utils/files';
import { attachmentsApi } from './attachments.api';
import { attachmentKeys } from './attachments.keys';

export function useAttachments(taskId: string) {
  return useQuery({ queryKey: attachmentKeys.byTask(taskId), queryFn: () => attachmentsApi.list(taskId) });
}

export interface UploadVariables {
  file: File;
  onProgress?: (fraction: number) => void;
}

/** Use `mutateAsync`: vários arquivos podem subir ao mesmo tempo, cada um com o seu progresso. */
export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: UploadVariables) => attachmentsApi.upload(taskId, file, onProgress),
    onSuccess: (created) => {
      queryClient.setQueryData<Attachment[]>(attachmentKeys.byTask(taskId), (current) =>
        current ? [...current.filter((item) => item.id !== created.id), created] : current,
      );
      return queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
    },
  });
}

export function useRemoveAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.remove(attachmentId),
    onSuccess: (_, attachmentId) => {
      queryClient.setQueryData<Attachment[]>(attachmentKeys.byTask(taskId), (current) =>
        current?.filter((item) => item.id !== attachmentId),
      );
      return queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
    },
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (attachment: Attachment) => {
      saveFile(await attachmentsApi.download(attachment.id), attachment.fileName);
    },
  });
}

/** Conteúdo do arquivo para o preview. Sai do cache assim que o preview fecha. */
export function useAttachmentFile(attachmentId: string) {
  return useQuery({
    queryKey: attachmentKeys.file(attachmentId),
    queryFn: () => attachmentsApi.download(attachmentId),
    staleTime: Infinity,
    gcTime: 0,
  });
}

/**
 * Mesma chave e mesma rota de `projectKeys.detail` (features/projects): reaproveita o cache do projeto sem importar
 * a outra feature. Projeto arquivado é somente leitura para os anexos.
 */
export function useProjectWritable(projectId: string): boolean {
  const { data, isError } = useQuery({
    queryKey: ['projects', 'detail', projectId] as const,
    queryFn: () => attachmentsApi.getProject(projectId),
  });
  // Sem a resposta, o backend continua decidindo (409 PROJECT_ARCHIVED)
  if (isError) return true;
  return !!data && !data.archivedAt;
}
