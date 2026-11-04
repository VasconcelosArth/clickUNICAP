import { describe, expect, it } from 'vitest';
import { createTaskSchema, moveTaskSchema, taskFiltersSchema, updateTaskSchema } from './task.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('createTaskSchema', () => {
  it('aceita só o título e apara espaços', () => {
    expect(createTaskSchema.parse({ title: '  Escrever docs  ' })).toEqual({ title: 'Escrever docs' });
  });

  it('rejeita título vazio', () => {
    expect(createTaskSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('rejeita status e prioridade fora do enum', () => {
    expect(createTaskSchema.safeParse({ title: 'x', status: 'a_fazer' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'x', priority: 'normal' }).success).toBe(false);
  });

  it('rejeita data fora do formato AAAA-MM-DD', () => {
    expect(createTaskSchema.safeParse({ title: 'x', dueDate: '20/11/2026' }).success).toBe(false);
  });

  it('rejeita início depois do prazo, apontando o campo startDate', () => {
    const r = createTaskSchema.safeParse({ title: 'x', startDate: '2026-11-21', dueDate: '2026-11-20' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['startDate']);
  });

  it('aceita início igual ao prazo', () => {
    expect(createTaskSchema.safeParse({ title: 'x', startDate: '2026-11-20', dueDate: '2026-11-20' }).success).toBe(true);
  });
});

describe('updateTaskSchema', () => {
  it('aceita objeto vazio (PATCH parcial)', () => {
    expect(updateTaskSchema.parse({})).toEqual({});
  });

  it('permite limpar o responsável com null', () => {
    expect(updateTaskSchema.parse({ assigneeId: null })).toEqual({ assigneeId: null });
  });
});

describe('moveTaskSchema', () => {
  it('exige status e aceita vizinhos nulos (coluna vazia)', () => {
    expect(moveTaskSchema.parse({ status: 'done', beforeTaskId: null, afterTaskId: null })).toMatchObject({ status: 'done' });
    expect(moveTaskSchema.safeParse({ beforeTaskId: null, afterTaskId: null }).success).toBe(false);
  });
});

describe('taskFiltersSchema', () => {
  it('converte listas separadas por vírgula da query string', () => {
    expect(taskFiltersSchema.parse({ status: 'todo,done', assigneeId: uuid })).toEqual({
      status: ['todo', 'done'],
      assigneeId: [uuid],
    });
  });

  it('aceita arrays (query repetida ?status=a&status=b)', () => {
    expect(taskFiltersSchema.parse({ priority: ['high', 'urgent'] })).toEqual({ priority: ['high', 'urgent'] });
  });

  it('rejeita valor inválido dentro da lista', () => {
    expect(taskFiltersSchema.safeParse({ status: 'todo,xpto' }).success).toBe(false);
  });
});
