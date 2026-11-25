import { describe, expect, it } from 'vitest';
import { createTaskDependencySchema, taskDependenciesSchema } from './dependency.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('createTaskDependencySchema', () => {
  it('aceita o id da tarefa que bloqueia', () => {
    expect(createTaskDependencySchema.parse({ dependsOnTaskId: uuid })).toEqual({ dependsOnTaskId: uuid });
  });

  it('rejeita id que não é uuid e body vazio', () => {
    expect(createTaskDependencySchema.safeParse({ dependsOnTaskId: 'abc' }).success).toBe(false);
    expect(createTaskDependencySchema.safeParse({}).success).toBe(false);
  });
});

describe('taskDependenciesSchema', () => {
  it('aceita listas com o resumo das tarefas', () => {
    const summary = { id: uuid, title: 'Montar a vitrine', status: 'todo', startDate: null, dueDate: '2026-12-01' };
    expect(taskDependenciesSchema.parse({ blockedBy: [summary], blocking: [] })).toEqual({
      blockedBy: [summary],
      blocking: [],
    });
  });
});
