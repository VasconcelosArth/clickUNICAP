import type { CustomField } from '@clickunicap/shared';
import { formatDate } from '@/lib/utils';
import type { CustomFieldValue } from '../api/custom-fields.api';

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/**
 * Texto de um valor na Lista, conforme o tipo do campo. Devolve `null` quando não há o que mostrar (sem valor ou
 * checkbox desmarcado) e o valor salvo não bate com o tipo do campo.
 */
export function formatCustomFieldValue(field: Pick<CustomField, 'type'>, value: CustomFieldValue | undefined) {
  if (value === null || value === undefined) return null;
  switch (field.type) {
    case 'checkbox':
      return value === true ? '✓' : null;
    case 'number':
      return typeof value === 'number' ? numberFormat.format(value) : null;
    case 'date':
      return typeof value === 'string' && value ? formatDate(value) : null;
    case 'dropdown':
    case 'text':
      return typeof value === 'string' && value.trim() ? value : null;
  }
}
