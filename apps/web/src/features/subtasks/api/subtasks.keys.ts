export const subtaskKeys = {
  all: ['subtasks'] as const,
  byTask: (taskId: string) => [...subtaskKeys.all, 'task', taskId] as const,
};
