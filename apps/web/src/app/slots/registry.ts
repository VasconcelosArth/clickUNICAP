import { dependenciesSlot } from '@/features/dependencies';
import type { TaskSlot } from './task-detail-slots';
import { commentsSlot } from '@/features/comments';
import { subtasksSlot } from '@/features/subtasks';

/** Cada dono de feature adiciona UMA linha aqui quando a rota da frente existir. */
export const taskSlots: TaskSlot[] = [dependenciesSlot, subtasksSlot, commentsSlot];
