import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { CommentsPanel } from './components/CommentsPanel';

export const commentsSlot: TaskSlot = { id: 'comments', region: 'activity', order: 10, Component: CommentsPanel };
