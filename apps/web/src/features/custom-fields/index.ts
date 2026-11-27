import type { TaskSlot } from '@/app/slots/task-detail-slots';
import { CustomFieldsPanel } from './components/CustomFieldsPanel';

export { CustomFieldsPanel } from './components/CustomFieldsPanel';
export { useCustomFieldListColumns, type CustomFieldListColumn } from './hooks/useCustomFieldListColumns';

/** Campos e valores personalizados no detalhe da tarefa. A configuração é do projeto e restrita a admins pela API. */
export const customFieldsSlot: TaskSlot = {
  id: 'custom-fields',
  region: 'main',
  order: 10,
  Component: CustomFieldsPanel,
};
