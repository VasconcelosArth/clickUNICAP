import { TASK_STATUS_LABELS } from '@clickunicap/shared';
import { StatusBadge } from '@/components/ui';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import type { TaskGroup } from '@/lib/tasks';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ group }: { group: TaskGroup }) {
  const membersById = useMembersById();

  return (
    <section aria-label={TASK_STATUS_LABELS[group.status]} className="grow shrink-0 basis-72 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={group.status} />
        <span className="text-sm font-medium">{group.tasks.length}</span>
      </div>
      <div className="space-y-3">
        {group.tasks.map((task) => (
          <KanbanCard key={task.id} task={task} assignee={membersById.get(task.assigneeId ?? '')} />
        ))}
        {group.tasks.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-lg py-6 px-4 text-center text-sm">
            Nenhuma tarefa aqui
          </div>
        )}
      </div>
    </section>
  );
}
