import type { TaskPriority, TaskStatus } from '@clickunicap/shared';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@clickunicap/shared';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'gray' | 'sky' | 'green' | 'violet' | 'yellow' | 'red';

const toneClasses: Record<BadgeTone, string> = {
  gray: 'bg-gray-400/20 text-gray-600 dark:text-gray-300',
  sky: 'bg-sky-500/20 text-sky-800 dark:text-sky-300',
  green: 'bg-green-500/20 text-green-800 dark:text-green-300',
  violet: 'bg-violet-500/20 text-violet-700 dark:text-violet-300',
  yellow: 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-300',
  red: 'bg-red-500/20 text-red-800 dark:text-red-300',
};

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<TaskStatus, BadgeTone> = { todo: 'gray', in_progress: 'sky', done: 'green' };

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={statusTones[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

const priorityTones: Record<TaskPriority, BadgeTone> = {
  low: 'gray',
  medium: 'violet',
  high: 'yellow',
  urgent: 'red',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={priorityTones[priority]}>{TASK_PRIORITY_LABELS[priority]}</Badge>;
}
