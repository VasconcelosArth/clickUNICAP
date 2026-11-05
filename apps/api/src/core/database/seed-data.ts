import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@clickunicap/shared';

export const SEED_PASSWORD = 'senha123';
export const SEED_USERS = [
  { name: 'Ana', email: 'ana@clickunicap.dev' },
  { name: 'Bruno', email: 'bruno@clickunicap.dev' },
  { name: 'Carla', email: 'carla@clickunicap.dev' },
];

export interface SeedTask {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIndex: number | null;
  position: number;
}

/** Monta tarefas variadas, com a posição contada por coluna. Função pura para poder testar. */
export function buildSeedTasks(prefix: string, total: number): SeedTask[] {
  const nextPosition: Record<string, number> = {};
  return Array.from({ length: total }, (_, i) => {
    const status = TASK_STATUSES[i % TASK_STATUSES.length] as TaskStatus;
    nextPosition[status] = (nextPosition[status] ?? 0) + 1;
    return {
      title: `${prefix}: tarefa ${i + 1}`,
      status,
      priority: TASK_PRIORITIES[i % TASK_PRIORITIES.length] as TaskPriority,
      assigneeIndex: i % 4 === 3 ? null : i % SEED_USERS.length,
      position: nextPosition[status],
    };
  });
}
