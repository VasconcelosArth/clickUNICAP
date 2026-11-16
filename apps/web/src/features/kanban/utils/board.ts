import type { MoveTaskInput, Task, TaskStatus } from '@clickunicap/shared';
import { groupByStatus } from '@/lib/tasks';

/** As três colunas do quadro, cada uma na ordem de posição. */
export type BoardColumns = Record<TaskStatus, Task[]>;

const COLUMN_PREFIX = 'column:';

/** Id de droppable da coluna, para soltar numa coluna vazia ou abaixo do último cartão. */
export const columnDropId = (status: TaskStatus) => `${COLUMN_PREFIX}${status}`;

export function toColumns(tasks: Task[]): BoardColumns {
  return Object.fromEntries(groupByStatus(tasks).map((group) => [group.status, group.tasks])) as BoardColumns;
}

/** Coluna de um cartão ou de uma coluna (pelo id de droppable). */
export function findColumn(columns: BoardColumns, id: string): TaskStatus | undefined {
  if (id.startsWith(COLUMN_PREFIX)) {
    const status = id.slice(COLUMN_PREFIX.length);
    return status in columns ? (status as TaskStatus) : undefined;
  }
  return (Object.keys(columns) as TaskStatus[]).find((status) => columns[status].some((task) => task.id === id));
}

/**
 * Leva o cartão `activeId` para onde está `overId` (outro cartão ou uma coluna). Na mesma coluna, troca de
 * lugar; em outra, entra no lugar do cartão de destino (ou no fim, se o destino é a coluna) e muda o status.
 */
export function moveCard(columns: BoardColumns, activeId: string, overId: string): BoardColumns {
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);
  if (!from || !to || activeId === overId) return columns;

  const source = columns[from];
  const moving = source.find((task) => task.id === activeId);
  if (!moving) return columns;
  const overIsColumn = overId === columnDropId(to);

  if (from === to) {
    if (overIsColumn) return columns;
    const next = source.filter((task) => task.id !== activeId);
    const overIndex = source.findIndex((task) => task.id === overId);
    next.splice(overIndex, 0, moving);
    return { ...columns, [to]: next };
  }

  const target = columns[to];
  const overIndex = target.findIndex((task) => task.id === overId);
  const insertAt = overIsColumn || overIndex === -1 ? target.length : overIndex;
  const next = [...target];
  next.splice(insertAt, 0, { ...moving, status: to });
  return { ...columns, [from]: source.filter((task) => task.id !== activeId), [to]: next };
}

/**
 * O corpo da rota de mover a partir do quadro já arrumado. Com filtro ativo, a coluna na tela é só uma parte
 * da coluna real, então vai um vizinho só: mandar os dois daria `POSITION_CHANGED` sempre que houvesse uma
 * tarefa escondida entre eles.
 */
export function moveInputFor(columns: BoardColumns, taskId: string, filtered: boolean): MoveTaskInput | undefined {
  const status = findColumn(columns, taskId);
  if (!status) return undefined;
  const column = columns[status];
  const index = column.findIndex((task) => task.id === taskId);
  const beforeTaskId = column[index - 1]?.id ?? null;
  const afterTaskId = column[index + 1]?.id ?? null;
  if (!filtered) return { status, beforeTaskId, afterTaskId };
  return beforeTaskId ? { status, beforeTaskId, afterTaskId: null } : { status, beforeTaskId: null, afterTaskId };
}

/** Se a tarefa terminou na mesma coluna e no mesmo lugar, não há o que gravar. */
export function isSamePlace(before: BoardColumns, after: BoardColumns, taskId: string): boolean {
  const status = findColumn(before, taskId);
  if (!status || status !== findColumn(after, taskId)) return false;
  return (
    before[status].findIndex((task) => task.id === taskId) === after[status].findIndex((task) => task.id === taskId)
  );
}

/** Atualização otimista do cache: a mesma regra de vizinhos da API, sobre a lista que a tela já tem. */
export function applyMove(tasks: Task[], taskId: string, input: MoveTaskInput): Task[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;
  const rest = tasks.filter((task) => task.id !== taskId);
  const moved: Task = { ...moving, status: input.status };

  const beforeIndex = input.beforeTaskId ? rest.findIndex((task) => task.id === input.beforeTaskId) : -1;
  const afterIndex = input.afterTaskId ? rest.findIndex((task) => task.id === input.afterTaskId) : -1;
  let insertAt: number;
  if (beforeIndex !== -1) insertAt = beforeIndex + 1;
  else if (afterIndex !== -1) insertAt = afterIndex;
  else {
    // Fim da coluna: logo depois da última tarefa com esse status
    const lastInColumn = rest.reduce((last, task, index) => (task.status === input.status ? index : last), -1);
    insertAt = lastInColumn === -1 ? rest.length : lastInColumn + 1;
  }

  rest.splice(insertAt, 0, moved);
  return rest;
}
