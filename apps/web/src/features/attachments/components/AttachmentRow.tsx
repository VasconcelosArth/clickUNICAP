import type { Attachment } from '@clickunicap/shared';
import { Button, ConfirmAction, FileIcon } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { formatFileSize, isPreviewable } from '../utils/files';

interface AttachmentRowProps {
  attachment: Attachment;
  uploaderName: string;
  canRemove: boolean;
  removing: boolean;
  downloading: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onRemove: () => void;
}

/** Uma linha por arquivo: ícone, nome, tamanho, quem enviou, data e ações. */
export function AttachmentRow({
  attachment,
  uploaderName,
  canRemove,
  removing,
  downloading,
  onPreview,
  onDownload,
  onRemove,
}: AttachmentRowProps) {
  const { fileName } = attachment;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <FileIcon className="text-gray-400 dark:text-gray-500" />
      <div className="min-w-0 flex-1">
        <p title={fileName} className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
          {fileName}
        </p>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="tabular-nums">{formatFileSize(attachment.sizeBytes)}</span> · {uploaderName} ·{' '}
          <time dateTime={attachment.createdAt}>{formatDate(attachment.createdAt)}</time>
        </p>
      </div>
      <div className="flex items-center gap-1">
        {isPreviewable(attachment.mimeType) && (
          <Button variant="ghost" size="xs" aria-label={`Visualizar ${fileName}`} onClick={onPreview}>
            Visualizar
          </Button>
        )}
        <Button variant="ghost" size="xs" aria-label={`Baixar ${fileName}`} loading={downloading} onClick={onDownload}>
          Baixar
        </Button>
        {canRemove && (
          <ConfirmAction
            label="Remover"
            ariaLabel={`Remover ${fileName}`}
            question={`Remover "${fileName}"? Não dá para desfazer.`}
            confirmLabel="Remover"
            pending={removing}
            onConfirm={onRemove}
            triggerProps={{ variant: 'ghost', size: 'xs', className: 'text-red-800 dark:text-red-400' }}
          />
        )}
      </div>
    </li>
  );
}
