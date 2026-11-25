/**
 * Chaves de dependências, compartilhadas pelas features `dependencies` (detalhe da tarefa) e `gantt`:
 * criar ou remover uma dependência no detalhe atualiza as setas do Gantt.
 */
export const dependencyKeys = {
  all: ['dependencies'] as const,
  byTask: (taskId: string) => [...dependencyKeys.all, 'task', taskId] as const,
  byProject: (projectId: string) => [...dependencyKeys.all, 'project', projectId] as const,
};
