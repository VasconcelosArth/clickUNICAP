export const customFieldKeys = {
  all: ['custom-fields'] as const,
  project: (projectId: string) => [...customFieldKeys.all, 'project', projectId] as const,
  projectValues: (projectId: string) => [...customFieldKeys.all, 'project-values', projectId] as const,
  taskValues: (taskId: string) => [...customFieldKeys.all, 'task-values', taskId] as const,
};

/**
 * Mesma chave de `projectKeys.detail` (features/projects). A feature não pode importar a de projetos, então repete a
 * chave para dividir o cache: abrir a tarefa a partir do projeto não faz outra requisição, e arquivar ou restaurar
 * (que invalida `['projects']`) atualiza o painel.
 */
export const projectDetailKey = (projectId: string) => ['projects', 'detail', projectId] as const;
