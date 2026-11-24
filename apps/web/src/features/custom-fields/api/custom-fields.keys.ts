export const customFieldKeys = {
  all: ['custom-fields'] as const,
  project: (projectId: string) => [...customFieldKeys.all, 'project', projectId] as const,
  taskValues: (taskId: string) => [...customFieldKeys.all, 'task-values', taskId] as const,
};
