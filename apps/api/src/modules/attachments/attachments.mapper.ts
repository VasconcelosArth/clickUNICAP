import type { Attachment } from '@clickunicap/shared';
import type { AttachmentRow } from './attachments.repository';

/** Row → API response. `storageKey` is an internal detail and never leaves the server. */
export function toAttachmentDto(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    taskId: row.taskId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}
