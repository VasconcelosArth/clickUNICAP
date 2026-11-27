import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui';
import { useProjectCustomFieldValues, useProjectCustomFields } from '../api/custom-fields.queries';
import { CustomFieldValueCell } from '../components/CustomFieldValueCell';

/** Uma coluna extra da Lista. Mesmo formato que a `TaskListPage` recebe; o `app/` liga as duas features. */
export interface CustomFieldListColumn {
  id: string;
  header: string;
  renderCell: (taskId: string) => ReactNode;
}

/**
 * Uma coluna por campo personalizado do projeto, na ordem dos campos. Os valores vêm numa chamada só
 * (`GET /projects/:projectId/custom-field-values`). Se os campos falharem, a Lista segue sem as colunas.
 */
export function useCustomFieldListColumns(projectId: string): CustomFieldListColumn[] {
  const fields = useProjectCustomFields(projectId);
  const values = useProjectCustomFieldValues(projectId);

  return (fields.data ?? []).map((field) => ({
    id: field.id,
    header: field.name,
    renderCell: (taskId) =>
      values.isPending ? (
        <Skeleton className="h-4 w-12" aria-hidden="true" />
      ) : (
        <CustomFieldValueCell field={field} value={values.data?.[taskId]?.[field.id]} />
      ),
  }));
}
