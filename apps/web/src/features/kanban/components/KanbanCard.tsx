import type { MemberWithUser, Task } from '@clickunicap/shared';
import { Link } from 'react-router-dom';
import { Avatar, DueDate, PriorityBadge } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';

export function KanbanCard({ task, assignee }: { task: Task; assignee: MemberWithUser | undefined }) {
  const taskLink = useTaskLink();

  return (
    <article className="bg-white dark:bg-gray-800 shadow-xs rounded-lg p-4">
      <Link
        {...taskLink(task.id)}
        className="block text-sm font-semibold text-gray-800 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400 mb-3"
      >
        {task.title}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <PriorityBadge priority={task.priority} />
          <DueDate task={task} />
        </div>
        <Avatar name={assignee?.name} avatarUrl={assignee?.avatarUrl} />
      </div>
    </article>
  );
}
