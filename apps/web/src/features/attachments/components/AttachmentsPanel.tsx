import type { Attachment } from '@clickunicap/shared';
import { useId, useState } from 'react';
import { Alert, CloseIcon, ErrorState, IconButton, SectionLabel, Skeleton } from '@/components/ui';
import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import {
  useAttachments,
  useDownloadAttachment,
  useProjectWritable,
  useRemoveAttachment,
  useUploadAttachment,
} from '../api/attachments.queries';
import { validateFile } from '../utils/files';
import { AttachmentDropzone } from './AttachmentDropzone';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { AttachmentRow } from './AttachmentRow';

interface UploadItem {
  id: string;
  fileName: string;
  /** De 0 a 1. */
  progress: number;
  error: string | null;
}

let uploadCounter = 0;

function UploadProgress({ item, onDismiss }: { item: UploadItem; onDismiss: () => void }) {
  const percent = Math.round(item.progress * 100);
  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.fileName}</p>
        {item.error ? (
          <IconButton aria-label={`Dispensar o aviso de ${item.fileName}`} onClick={onDismiss}>
            <CloseIcon />
          </IconButton>
        ) : (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">{percent}%</span>
        )}
      </div>
      {item.error ? (
        <p role="alert" className="text-xs mt-1 text-red-800 dark:text-red-400">
          Não foi enviado: {item.error}
        </p>
      ) : (
        <div
          role="progressbar"
          aria-label={`Enviando ${item.fileName}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden"
        >
          <div className="h-full bg-violet-500 transition-all duration-150" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  );
}

/** Slot `attachments` do detalhe da tarefa: lista, envio, download, preview e remoção. */
export function AttachmentsPanel({ taskId, projectId }: TaskSlotProps) {
  const listId = useId();
  const { data: attachments, isPending, error, refetch } = useAttachments(taskId);
  const writable = useProjectWritable(projectId);
  const { data: currentUser } = useCurrentUser();
  const { isAdmin } = useCurrentWorkspace();
  const membersById = useMembersById();
  const upload = useUploadAttachment(taskId);
  const remove = useRemoveAttachment(taskId);
  const download = useDownloadAttachment();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);

  const patchUpload = (id: string, patch: Partial<UploadItem>) =>
    setUploads((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const dropUpload = (id: string) => setUploads((items) => items.filter((item) => item.id !== id));

  const sendFiles = (files: File[]) => {
    const problems: string[] = [];
    for (const file of files) {
      const problem = validateFile(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      uploadCounter += 1;
      const id = `upload-${uploadCounter}`;
      setUploads((items) => [...items, { id, fileName: file.name, progress: 0, error: null }]);
      upload
        .mutateAsync({ file, onProgress: (progress) => patchUpload(id, { progress }) })
        .then(() => dropUpload(id))
        .catch((uploadError: unknown) =>
          patchUpload(id, {
            error: uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o arquivo.',
          }),
        );
    }
    setRejected(problems);
  };

  const uploaderName = (userId: string) => membersById.get(userId)?.name ?? 'Ex-membro do workspace';
  const canRemove = (attachment: Attachment) => writable && (attachment.uploadedBy === currentUser?.id || isAdmin);
  const actionError = remove.error ?? download.error;

  return (
    <div className="space-y-3">
      <SectionLabel id={listId}>Anexos{attachments?.length ? ` (${attachments.length})` : ''}</SectionLabel>

      {writable ? (
        <AttachmentDropzone onFiles={sendFiles} />
      ) : (
        <p className="text-sm">Projeto arquivado: os anexos ficam somente leitura.</p>
      )}

      {rejected.length > 0 && (
        <Alert>
          <ul>
            {rejected.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}
      {actionError && <Alert>{actionError.message}</Alert>}

      {uploads.length > 0 && (
        <ul aria-label="Envios em andamento" className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {uploads.map((item) => (
            <UploadProgress key={item.id} item={item} onDismiss={() => dropUpload(item.id)} />
          ))}
        </ul>
      )}

      {isPending && (
        <div role="status" aria-label="Carregando anexos" className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {attachments && attachments.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo nesta tarefa.</p>
      )}
      {attachments && attachments.length > 0 && (
        <ul aria-labelledby={listId} className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              uploaderName={uploaderName(attachment.uploadedBy)}
              canRemove={canRemove(attachment)}
              removing={remove.isPending && remove.variables === attachment.id}
              downloading={download.isPending && download.variables?.id === attachment.id}
              onPreview={() => setPreviewing(attachment)}
              onDownload={() => {
                remove.reset();
                download.mutate(attachment);
              }}
              onRemove={() => {
                download.reset();
                remove.mutate(attachment.id);
              }}
            />
          ))}
        </ul>
      )}

      {previewing && <AttachmentPreviewModal attachment={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
