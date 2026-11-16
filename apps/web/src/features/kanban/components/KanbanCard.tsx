import type { MemberWithUser, Task } from '@clickunicap/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Avatar, DueDate, PriorityBadge } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
  assignee: MemberWithUser | undefined;
}

const cardClasses = 'bg-white dark:bg-gray-800 shadow-xs rounded-lg p-4';

function CardContent({ task, assignee }: KanbanCardProps) {
  const taskLink = useTaskLink();

  return (
    <>
      <Link
        {...taskLink(task.id)}
        // Sem o arrastar nativo do link, que atrapalharia o do cartão
        draggable={false}
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
    </>
  );
}

/**
 * Cartão arrastável. O foco fica no próprio cartão (espaço ou Enter pega, setas movem, Esc cancela),
 * e o título continua sendo um link para o detalhe.
 */
export function KanbanCard({ task, assignee, disabled }: KanbanCardProps & { disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
    // `listitem` em vez de `button`: o cartão tem um link dentro, e botão não pode conter link
    attributes: { role: 'listitem', roleDescription: 'cartão arrastável' },
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={task.title}
      {...attributes}
      {...listeners}
      className={cn(
        cardClasses,
        'mb-3 last:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
        !disabled && 'cursor-grab',
        // Onde o cartão vai cair: o espaço dele fica marcado enquanto o original segue o ponteiro
        isDragging &&
          'bg-transparent dark:bg-transparent shadow-none border-2 border-dashed border-gray-300 dark:border-gray-700/60',
      )}
    >
      <div className={cn(isDragging && 'invisible')}>
        <CardContent task={task} assignee={assignee} />
      </div>
    </article>
  );
}

/** O cartão que segue o ponteiro durante o arraste. */
export function KanbanCardOverlay(props: KanbanCardProps) {
  return (
    <article className={cn(cardClasses, 'cursor-grabbing shadow-lg ring-2 ring-violet-500/50')}>
      <CardContent {...props} />
    </article>
  );
}
