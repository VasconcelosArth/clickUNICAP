import type { CustomField } from '@clickunicap/shared';
import type { CustomFieldValue } from '../api/custom-fields.api';
import { formatCustomFieldValue } from '../utils/formatCustomFieldValue';

/** Valor de um campo personalizado numa célula da Lista, formatado pelo tipo. */
export function CustomFieldValueCell({ field, value }: { field: CustomField; value: CustomFieldValue | undefined }) {
  const text = formatCustomFieldValue(field, value);
  if (text === null) {
    return (
      <span className="text-gray-400 dark:text-gray-500">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sem valor</span>
      </span>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <span role="img" aria-label="Sim" className="text-green-600 dark:text-green-400">
        ✓
      </span>
    );
  }
  if (field.type === 'number') return <span className="tabular-nums">{text}</span>;
  if (field.type === 'date') return <span className="whitespace-nowrap">{text}</span>;
  return (
    <span className="block max-w-48 truncate" title={text}>
      {text}
    </span>
  );
}
