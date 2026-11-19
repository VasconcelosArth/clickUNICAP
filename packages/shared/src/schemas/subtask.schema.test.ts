import { describe, it, expect } from 'vitest';
import { subtaskSchema, createSubtaskSchema, updateSubtaskSchema } from './subtask.schema';
import { randomUUID } from 'node:crypto';

const valid = {
  id: randomUUID(),
  taskId: randomUUID(),
  title: 'Escrever testes',
  isDone: false,
  position: 1,
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
};

describe('subtask schemas', () => {
  it('aceita uma subtarefa completa', () => {
    expect(subtaskSchema.safeParse(valid).success).toBe(true);
  });
  it('recusa id que não é UUID', () => {
    expect(subtaskSchema.safeParse({ ...valid, id: 'abc' }).success).toBe(false);
  });
});

describe('createSubtaskSchema', () => {
  it('aceita título válido', () => {
    expect(createSubtaskSchema.safeParse({ title: 'Escrever testes' }).success).toBe(true);
  });
  it('recusa título vazio', () => {
    expect(createSubtaskSchema.safeParse({ title: '' }).success).toBe(false);
  });
  it('recusa título só com espaços', () => {
    expect(createSubtaskSchema.safeParse({ title: '   ' }).success).toBe(false);
  });
  it('recusa título com mais de 200 caracteres', () => {
    expect(createSubtaskSchema.safeParse({ title: 'a'.repeat(201) }).success).toBe(false);
  });
  it('remove espaços nas pontas do título', () => {
    const r = createSubtaskSchema.parse({ title: '  revisar  ' });
    expect(r.title).toBe('revisar');
  });
});

describe('updateSubtaskSchema', () => {
  it('update aceita só isDone', () => {
    expect(updateSubtaskSchema.safeParse({ isDone: true }).success).toBe(true);
  });
  it('update recusa objeto vazio', () => {
    expect(updateSubtaskSchema.safeParse({}).success).toBe(false);
  });
  it('recusa isDone que não é booleano', () => {
    expect(updateSubtaskSchema.safeParse({ isDone: 'sim' }).success).toBe(false);
  });
  it('recusa title vazio', () => {
    expect(updateSubtaskSchema.safeParse({ title: '' }).success).toBe(false);
  });
  it('não aceita position: o campo é ignorado e o update fica vazio', () => {
    expect(updateSubtaskSchema.safeParse({ position: 2 }).success).toBe(false);
  });
});
