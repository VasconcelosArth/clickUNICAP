import { attachmentsSlot } from '@/features/attachments';
import { dependenciesSlot } from '@/features/dependencies';
import type { TaskSlot } from './task-detail-slots';

/** Cada dono de feature adiciona UMA linha aqui quando a rota da frente existir. */
export const taskSlots: TaskSlot[] = [dependenciesSlot, attachmentsSlot];
