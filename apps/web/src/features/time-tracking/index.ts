import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { TimeTrackingPanel } from './components/TimeTrackingPanel';

export { TimeTrackingPanel } from './components/TimeTrackingPanel';

/** Controle de tempo na barra lateral do detalhe da tarefa, acima das dependências. */
export const timeTrackingSlot: TaskSlot = {
  id: 'time-tracking',
  region: 'sidebar',
  order: 10,
  Component: TimeTrackingPanel,
};
