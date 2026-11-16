import type { MemberWithUser, Task, TaskStatus } from '@clickunicap/shared';
import { TASK_STATUS_LABELS } from '@clickunicap/shared';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { columnDropId } from '../utils/board';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  membersById: Map<string, MemberWithUser>;
  disabled: boolean;
}

export function KanbanColumn({ status, tasks, membersById, disabled }: KanbanColumnProps) {
  // A coluna inteira recebe o cartão: vale para coluna vazia e para soltar abaixo do último
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status), disabled });

  return (
    <section aria-label={TASK_STATUS_LABELS[status]} className="grow shrink-0 basis-72 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={status} />
        <span className="text-sm font-medium">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="grow min-h-24">
        <SortableContext id={status} items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 && (
            <div role="list">
              {tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  assignee={membersById.get(task.assigneeId ?? '')}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </SortableContext>
        {tasks.length === 0 && (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg py-6 px-4 text-center text-sm',
              isOver ? 'border-gray-300 dark:border-gray-700/60' : 'border-gray-200 dark:border-gray-700/60',
            )}
          >
            Nenhuma tarefa aqui
          </div>
        )}
      </div>
    </section>
  );
}
