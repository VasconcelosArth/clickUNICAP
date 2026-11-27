import { customFieldsSlot } from '@/features/custom-fields';
import { dependenciesSlot } from '@/features/dependencies';
import { timeTrackingSlot } from '@/features/time-tracking';
import type { TaskSlot } from './task-detail-slots';

/** Cada dono de feature adiciona UMA linha aqui quando a rota da frente existir. */
export const taskSlots: TaskSlot[] = [dependenciesSlot, customFieldsSlot, timeTrackingSlot];
