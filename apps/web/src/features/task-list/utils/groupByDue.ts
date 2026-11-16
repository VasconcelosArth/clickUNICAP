import type { Task } from '@clickunicap/shared';
import { isOverdue } from '@/lib/tasks';
import { endOfWeekIso, todayIso } from '@/lib/utils';

export type DueGroupId = 'overdue' | 'thisWeek' | 'later' | 'noDueDate';

export interface DueGroup {
  id: DueGroupId;
  label: string;
  tasks: Task[];
}

const GROUPS: { id: DueGroupId; label: string }[] = [
  { id: 'overdue', label: 'Vencidas' },
  { id: 'thisWeek', label: 'Nesta semana' },
  { id: 'later', label: 'Mais adiante' },
  { id: 'noDueDate', label: 'Sem prazo' },
];

function dueGroupOf(task: Task, today: string, weekEnd: string): DueGroupId {
  if (!task.dueDate) return 'noDueDate';
  if (isOverdue(task, today)) return 'overdue';
  return task.dueDate <= weekEnd ? 'thisWeek' : 'later';
}

/** Minhas tarefas: agrupa pelo prazo, do mais urgente ao sem prazo, e omite grupo vazio. Dentro do grupo, prazo crescente. */
export function groupByDue(tasks: Task[], today = todayIso()): DueGroup[] {
  const weekEnd = endOfWeekIso(today);
  const sorted = [...tasks].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  return GROUPS.map((group) => ({
    ...group,
    tasks: sorted.filter((task) => dueGroupOf(task, today, weekEnd) === group.id),
  })).filter((group) => group.tasks.length > 0);
}
