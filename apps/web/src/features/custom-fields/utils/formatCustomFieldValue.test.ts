import { formatCustomFieldValue } from './formatCustomFieldValue';

describe('formatCustomFieldValue', () => {
  it('formata data, número, checkbox, dropdown e texto', () => {
    expect(formatCustomFieldValue({ type: 'date' }, '2026-12-05')).toBe('5 dez 2026');
    expect(formatCustomFieldValue({ type: 'number' }, 1234.5)).toBe('1.234,5');
    expect(formatCustomFieldValue({ type: 'checkbox' }, true)).toBe('✓');
    expect(formatCustomFieldValue({ type: 'dropdown' }, 'Design')).toBe('Design');
    expect(formatCustomFieldValue({ type: 'text' }, 'CU-101')).toBe('CU-101');
  });

  it('devolve null sem valor, com checkbox desmarcado ou texto vazio', () => {
    expect(formatCustomFieldValue({ type: 'text' }, undefined)).toBeNull();
    expect(formatCustomFieldValue({ type: 'number' }, null)).toBeNull();
    expect(formatCustomFieldValue({ type: 'checkbox' }, false)).toBeNull();
    expect(formatCustomFieldValue({ type: 'text' }, '   ')).toBeNull();
  });

  it('ignora valor com tipo diferente do campo', () => {
    expect(formatCustomFieldValue({ type: 'number' }, '3')).toBeNull();
    expect(formatCustomFieldValue({ type: 'date' }, 3)).toBeNull();
  });
});
