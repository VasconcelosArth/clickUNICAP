import { customFieldsSlot } from '@/features/custom-fields';
import { attachmentsSlot } from '@/features/attachments';
import { dependenciesSlot } from '@/features/dependencies';
import { timeTrackingSlot } from '@/features/time-tracking';
import type { TaskSlot } from './task-detail-slots';
import { commentsSlot } from '@/features/comments';
import { subtasksSlot } from '@/features/subtasks';

/** Cada dono de feature adiciona UMA linha aqui quando a rota da frente existir. */
export const taskSlots: TaskSlot[] = [
  dependenciesSlot,
  subtasksSlot,
  commentsSlot,
  attachmentsSlot,
  customFieldsSlot,
  timeTrackingSlot,
];
