import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { AttachmentsPanel } from './components/AttachmentsPanel';

export { AttachmentsPanel } from './components/AttachmentsPanel';

/** Anexos na região `attachments` do detalhe da tarefa (slot `task-detail.attachments`). */
export const attachmentsSlot: TaskSlot = {
  id: 'attachments',
  region: 'attachments',
  order: 10,
  Component: AttachmentsPanel,
};
