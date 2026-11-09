import { TASK_STATUSES, type Task, type TaskStatus } from '@clickunicap/shared';
import { endOfWeekIso, todayIso } from './utils';

export function isOverdue(task: Pick<Task, 'status' | 'dueDate'>, today = todayIso()): boolean {
  return task.status !== 'done' && !!task.dueDate && task.dueDate < today;
}

export interface TaskGroup {
  status: TaskStatus;
  tasks: Task[];
}

/** Agrupa nas três colunas fixas. A API já devolve cada status ordenado por posição. */
export function groupByStatus(tasks: Task[]): TaskGroup[] {
  return TASK_STATUSES.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }));
}

export interface TaskSummary {
  total: number;
  done: number;
  progress: number;
  overdue: number;
  dueThisWeek: number;
  weekEnd: string;
}

export function summarizeTasks(tasks: Task[], today = todayIso()): TaskSummary {
  const weekEnd = endOfWeekIso(today);
  const done = tasks.filter((task) => task.status === 'done').length;
  return {
    total: tasks.length,
    done,
    progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    overdue: tasks.filter((task) => isOverdue(task, today)).length,
    dueThisWeek: tasks.filter(
      (task) => task.status !== 'done' && !!task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd,
    ).length,
    weekEnd,
  };
}
