import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { SubtasksPanel } from './components/SubtasksPanel';

export const subtasksSlot: TaskSlot = { id: 'subtasks', region: 'main', order: 10, Component: SubtasksPanel };
