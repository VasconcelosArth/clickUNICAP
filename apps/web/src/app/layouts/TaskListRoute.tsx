import { useParams } from 'react-router-dom';
import { useCustomFieldListColumns } from '@/features/custom-fields';
import { TaskListPage } from '@/features/task-list';

/** Lista do projeto com uma coluna por campo personalizado. As features não se importam; o app liga as duas. */
export function TaskListRoute() {
  const { projectId = '' } = useParams();
  const customFieldColumns = useCustomFieldListColumns(projectId);
  return <TaskListPage extraColumns={customFieldColumns} />;
}
