import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { DependenciesPanel } from './components/DependenciesPanel';

export { DependenciesPanel } from './components/DependenciesPanel';

/** Dependências na barra lateral do detalhe da tarefa, abaixo das propriedades. */
export const dependenciesSlot: TaskSlot = {
  id: 'dependencies',
  region: 'sidebar',
  order: 20,
  Component: DependenciesPanel,
};
