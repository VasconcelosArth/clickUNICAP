import type { Task, TaskStatus } from '@clickunicap/shared';
import { TASK_STATUS_LABELS } from '@clickunicap/shared';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import { useMoveTask } from '../api/kanban.queries';
import { findColumn, isSamePlace, moveCard, moveInputFor, toColumns, type BoardColumns } from '../utils/board';
import { KanbanCardOverlay } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

/**
 * O teclado só pega o cartão quando o foco está nele. Com o foco no link do título, Enter abre a tarefa
 * em vez de começar o arraste.
 */
class CardKeyboardSensor extends KeyboardSensor {
  static override activators = KeyboardSensor.activators.map((activator) => ({
    ...activator,
    handler: (...args: Parameters<typeof activator.handler>) =>
      args[0].target === args[0].currentTarget && activator.handler(...args),
  }));
}

const screenReaderInstructions = {
  draggable:
    'Para mover a tarefa, pressione espaço ou Enter. Use as setas para trocar de posição ou de coluna, ' +
    'espaço ou Enter para soltar, e Esc para cancelar.',
};

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  /** Com filtro ativo, a coluna na tela não tem todas as tarefas (muda os vizinhos enviados). */
  filtered: boolean;
  /** Projeto arquivado é somente leitura: o quadro aparece, mas não arrasta. */
  readOnly: boolean;
}

interface Draft {
  start: BoardColumns;
  columns: BoardColumns;
}

export function KanbanBoard({ projectId, tasks, filtered, readOnly }: KanbanBoardProps) {
  const membersById = useMembersById();
  const move = useMoveTask(projectId);
  // Enquanto arrasta (e até a API responder), o quadro mostra o arranjo local
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = useMemo(() => draft?.columns ?? toColumns(tasks), [draft, tasks]);
  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(CardKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const titleOf = (id: UniqueIdentifier) => tasks.find((task) => task.id === id)?.title ?? 'Tarefa';
  const placeOf = (id: UniqueIdentifier) => {
    const status = findColumn(columns, String(id));
    if (!status) return 'fora das colunas';
    const column = columns[status];
    const index = column.findIndex((task) => task.id === String(id));
    const label = TASK_STATUS_LABELS[status];
    return index === -1 ? `na coluna ${label}` : `na coluna ${label}, posição ${index + 1} de ${column.length}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tarefa ${titleOf(active.id)} pega, ${placeOf(active.id)}.`,
    onDragOver: ({ active }) => `Tarefa ${titleOf(active.id)} ${placeOf(active.id)}.`,
    onDragEnd: ({ active }) => `Tarefa ${titleOf(active.id)} solta ${placeOf(active.id)}.`,
    onDragCancel: ({ active }) => `Movimento cancelado. A tarefa ${titleOf(active.id)} voltou ao lugar.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    move.reset();
    setActiveId(String(active.id));
    setDraft({ start: columns, columns });
  };

  // Ao passar sobre outra coluna, o cartão já entra nela, para a lista abrir espaço no lugar certo
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(columns, String(active.id));
    const to = findColumn(columns, String(over.id));
    if (!from || !to || from === to) return;
    setDraft(
      (current) => current && { ...current, columns: moveCard(current.columns, String(active.id), String(over.id)) },
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!draft || !over) {
      setDraft(null);
      return;
    }
    const taskId = String(active.id);
    const final = moveCard(draft.columns, taskId, String(over.id));
    const input = moveInputFor(final, taskId, filtered);
    if (!input || isSamePlace(draft.start, final, taskId)) {
      setDraft(null);
      return;
    }
    setDraft({ ...draft, columns: final });
    move.mutate({ taskId, input }, { onSettled: () => setDraft(null) });
  };

  const onDragCancel = () => {
    setActiveId(null);
    setDraft(null);
  };

  return (
    <>
      {move.error && (
        <div className="mb-4">
          <Alert>{move.error.message} A tarefa voltou para onde estava.</Alert>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex gap-6 overflow-x-auto pb-2">
          {(Object.keys(columns) as TaskStatus[]).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              membersById={membersById}
              disabled={readOnly || move.isPending}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <KanbanCardOverlay task={activeTask} assignee={membersById.get(activeTask.assigneeId ?? '')} />
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
