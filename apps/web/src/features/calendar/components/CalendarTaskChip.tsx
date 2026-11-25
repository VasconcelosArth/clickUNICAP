/**
 * CalendarTaskChip — pastilha de tarefa exibida dentro de um dia do calendário.
 *
 * Segue as regras do guia de design (11-design-guia.md § Calendário):
 *   - `block truncate text-xs font-medium px-2 py-1 rounded-lg mb-1`
 *   - Cor de fundo baseada no status (mesmo sistema do Badge)
 *   - Clicável: navega para o detalhe da tarefa sem trocar a visão atual
 */

import type { Task } from '@clickunicap/shared';
import { Link, useLocation } from 'react-router-dom';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

// Cores por status, seguindo os mesmos tokens do Badge (11-design-guia.md)
const statusClasses: Record<Task['status'], string> = {
  todo: 'bg-gray-400/20 text-gray-700 dark:text-gray-200',
  in_progress: 'bg-sky-500/20 text-sky-800 dark:text-sky-300',
  done: 'bg-green-500/20 text-green-800 dark:text-green-300',
};

interface CalendarTaskChipProps {
  task: Task;
}

/**
 * Chip clicável que representa uma tarefa no dia do calendário.
 *
 * Usa `state.backgroundLocation` para que o modal de detalhe se abra
 * sobre o calendário, mantendo o contexto visual (igual ao Kanban).
 */
export function CalendarTaskChip({ task }: CalendarTaskChipProps) {
  const workspaceId = useActiveWorkspaceId();
  const location = useLocation();

  return (
    <Link
      to={routes.task(workspaceId, task.id)}
      state={{ backgroundLocation: location }}
      className={cn(
        'block truncate text-xs font-medium px-2 py-1 rounded-lg mb-1',
        'transition duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
        statusClasses[task.status],
      )}
      title={task.title}
      aria-label={`Abrir tarefa: ${task.title}`}
    >
      {task.title}
    </Link>
  );
}
