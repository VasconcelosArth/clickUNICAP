import type { Task } from '@clickunicap/shared';
import { isOverdue } from '@/lib/tasks';
import { cn, formatDay } from '@/lib/utils';

export function DueDate({ task }: { task: Pick<Task, 'status' | 'dueDate'> }) {
  const overdue = isOverdue(task);
  const label = task.dueDate ? `${overdue ? 'Venceu ' : ''}${formatDay(task.dueDate)}` : 'Sem prazo';

  return (
    <span
      className={cn(
        'text-xs font-medium whitespace-nowrap',
        overdue ? 'text-red-800 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
      )}
    >
      {label}
    </span>
  );
}
