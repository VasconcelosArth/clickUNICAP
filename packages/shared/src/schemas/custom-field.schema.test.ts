import { describe, expect, it } from 'vitest';
import {
  createCustomFieldSchema,
  customFieldSchema,
  customFieldValueSchema,
  projectCustomFieldValuesSchema,
  taskCustomFieldValuesSchema,
  updateCustomFieldSchema,
  updateTaskCustomFieldValuesSchema,
} from './custom-field.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
const otherUuid = '7b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';

describe('createCustomFieldSchema', () => {
  it('aceita campo de texto e preenche isRequired como false', () => {
    expect(createCustomFieldSchema.parse({ name: '  Código  ', type: 'text' })).toEqual({
      name: 'Código',
      type: 'text',
      isRequired: false,
    });
  });

  it('aceita dropdown com opções', () => {
    const input = { name: 'Categoria', type: 'dropdown', options: ['A', 'B'], isRequired: true };
    expect(createCustomFieldSchema.parse(input)).toEqual(input);
  });

  it('rejeita dropdown sem opções', () => {
    expect(createCustomFieldSchema.safeParse({ name: 'Categoria', type: 'dropdown' }).success).toBe(false);
    expect(createCustomFieldSchema.safeParse({ name: 'Categoria', type: 'dropdown', options: [] }).success).toBe(false);
  });

  it('rejeita opções repetidas e opções em tipo que não é dropdown', () => {
    expect(
      createCustomFieldSchema.safeParse({ name: 'Categoria', type: 'dropdown', options: ['A', 'A'] }).success,
    ).toBe(false);
    expect(createCustomFieldSchema.safeParse({ name: 'Feito', type: 'checkbox', options: ['Sim'] }).success).toBe(
      false,
    );
  });

  it('rejeita nome vazio, nome longo e tipo desconhecido', () => {
    expect(createCustomFieldSchema.safeParse({ name: '   ', type: 'text' }).success).toBe(false);
    expect(createCustomFieldSchema.safeParse({ name: 'x'.repeat(81), type: 'text' }).success).toBe(false);
    expect(createCustomFieldSchema.safeParse({ name: 'Cor', type: 'color' }).success).toBe(false);
  });
});

describe('updateCustomFieldSchema', () => {
  it('aceita alteração parcial', () => {
    expect(updateCustomFieldSchema.parse({ isRequired: true })).toEqual({ isRequired: true });
    expect(updateCustomFieldSchema.parse({})).toEqual({});
  });

  it('não permite trocar o tipo (a chave é descartada)', () => {
    expect(updateCustomFieldSchema.parse({ type: 'number' })).toEqual({});
  });

  it('rejeita lista de opções vazia ou repetida', () => {
    expect(updateCustomFieldSchema.safeParse({ options: [] }).success).toBe(false);
    expect(updateCustomFieldSchema.safeParse({ options: ['A', 'A'] }).success).toBe(false);
  });
});

describe('customFieldSchema', () => {
  it('aceita o campo como a API devolve', () => {
    const field = {
      id: uuid,
      projectId: otherUuid,
      name: 'Categoria',
      type: 'dropdown',
      options: ['A'],
      isRequired: false,
      position: 0,
      createdAt: '2026-11-20T12:00:00.000Z',
    };
    expect(customFieldSchema.parse(field)).toEqual(field);
  });
});

describe('valores dos campos', () => {
  it('aceita texto, número finito, booleano e null', () => {
    for (const value of ['x', 3.5, true, null]) {
      expect(customFieldValueSchema.parse(value)).toBe(value);
    }
    expect(customFieldValueSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(customFieldValueSchema.safeParse({}).success).toBe(false);
  });

  it('exige uuid como chave no mapa da tarefa e no body de gravação', () => {
    expect(taskCustomFieldValuesSchema.parse({ [uuid]: 'A' })).toEqual({ [uuid]: 'A' });
    expect(taskCustomFieldValuesSchema.safeParse({ abc: 'A' }).success).toBe(false);
    expect(updateTaskCustomFieldValuesSchema.safeParse({ values: { [uuid]: false } }).success).toBe(true);
    expect(updateTaskCustomFieldValuesSchema.safeParse({}).success).toBe(false);
  });

  it('agrupa os valores do projeto por tarefa', () => {
    const values = { [uuid]: { [otherUuid]: 2 } };
    expect(projectCustomFieldValuesSchema.parse(values)).toEqual(values);
    expect(projectCustomFieldValuesSchema.safeParse({ [uuid]: { [otherUuid]: [] } }).success).toBe(false);
  });
});
