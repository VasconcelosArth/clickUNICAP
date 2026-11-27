import { customFieldDateValueSchema } from '@clickunicap/shared';
import { buildSeedCustomFieldValues, buildSeedTasks, SEED_CUSTOM_FIELDS, SEED_USERS } from './seed-data';

describe('buildSeedTasks', () => {
  const tasks = buildSeedTasks('App', 15);

  it('gera a quantidade pedida, com status variados', () => {
    expect(tasks).toHaveLength(15);
    expect(new Set(tasks.map((t) => t.status)).size).toBe(3);
  });

  it('numera a posição dentro de cada coluna', () => {
    expect(tasks.filter((t) => t.status === 'todo').map((t) => t.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('usa só responsáveis existentes ou nenhum', () => {
    for (const t of tasks) {
      expect(t.assigneeIndex === null || t.assigneeIndex < SEED_USERS.length).toBe(true);
    }
    expect(tasks.some((t) => t.assigneeIndex === null)).toBe(true);
  });
});

describe('SEED_CUSTOM_FIELDS', () => {
  it('tem um campo de cada tipo, com nomes únicos', () => {
    expect(new Set(SEED_CUSTOM_FIELDS.map((f) => f.type))).toEqual(
      new Set(['text', 'number', 'date', 'dropdown', 'checkbox']),
    );
    expect(new Set(SEED_CUSTOM_FIELDS.map((f) => f.name.toLowerCase())).size).toBe(SEED_CUSTOM_FIELDS.length);
  });

  it('gera valores válidos para o tipo de cada campo', () => {
    for (const field of SEED_CUSTOM_FIELDS) {
      for (let i = 0; i < 15; i++) {
        const value = field.valueFor(i);
        if (value === null) continue;
        if (field.type === 'dropdown') expect(field.options).toContain(value);
        if (field.type === 'number') expect(typeof value).toBe('number');
        if (field.type === 'checkbox') expect(typeof value).toBe('boolean');
        if (field.type === 'date') expect(customFieldDateValueSchema.safeParse(value).success).toBe(true);
        if (field.type === 'text') expect(typeof value).toBe('string');
      }
    }
  });
});

describe('buildSeedCustomFieldValues', () => {
  it('liga cada tarefa aos campos e descarta os valores vazios', () => {
    const fields = SEED_CUSTOM_FIELDS.map((seed, i) => ({ id: `f${i}`, seed }));
    const values = buildSeedCustomFieldValues(['t0', 't1'], fields);

    expect(values).toContainEqual({ taskId: 't0', fieldId: 'f0', value: 'Design' });
    expect(values).toContainEqual({ taskId: 't1', fieldId: 'f3', value: false });
    expect(values.every((v) => v.value !== null)).toBe(true);
  });
});
