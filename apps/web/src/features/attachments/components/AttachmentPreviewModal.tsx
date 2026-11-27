import type { Attachment } from '@clickunicap/shared';
import { useEffect, useState } from 'react';
import { Alert, Button, ErrorState, Modal, Skeleton } from '@/components/ui';
import { useAttachmentFile, useDownloadAttachment } from '../api/attachments.queries';

interface AttachmentPreviewModalProps {
  attachment: Attachment;
  onClose: () => void;
}

/**
 * Cria o `blob:` URL do conteúdo e o revoga ao fechar ou trocar de arquivo. O tipo vem do metadado validado pelo
 * servidor (só imagem e PDF chegam aqui), nunca do que o navegador adivinharia.
 */
function useObjectUrl(blob: Blob | undefined, mimeType: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob, mimeType]);
  return url;
}

/** Preview de imagem ou PDF, em cima do detalhe da tarefa. */
export function AttachmentPreviewModal({ attachment, onClose }: AttachmentPreviewModalProps) {
  const { data, isPending, error, refetch } = useAttachmentFile(attachment.id);
  const url = useObjectUrl(data, attachment.mimeType);
  const download = useDownloadAttachment();
  const isPdf = attachment.mimeType === 'application/pdf';

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={<span className="break-all">{attachment.fileName}</span>}
      footer={
        <Button loading={download.isPending} onClick={() => download.mutate(attachment)}>
          Baixar
        </Button>
      }
    >
      {download.error && (
        <div className="mb-4">
          <Alert>{download.error.message}</Alert>
        </div>
      )}
      {isPending && (
        <div role="status" aria-label="Carregando o arquivo">
          <Skeleton className="h-96" />
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {url &&
        (isPdf ? (
          <iframe title={`Visualização de ${attachment.fileName}`} src={url} className="w-full h-128 rounded-lg" />
        ) : (
          <img src={url} alt={attachment.fileName} className="mx-auto max-h-128 max-w-full rounded-lg" />
        ))}
    </Modal>
  );
}
