import { ConflictError } from '@/core/errors';

/** Diferença mínima entre duas posições vizinhas. Abaixo disso a coluna é renumerada (docs/06). */
export const MIN_POSITION_GAP = 1e-6;

export interface PositionedTask {
  id: string;
  position: number;
}

/** Vizinhos da tarefa no destino. `null` nos dois lados significa: fim da coluna. */
export interface MoveNeighbors {
  beforeTaskId: string | null;
  afterTaskId: string | null;
}

export interface Placement {
  /** Posição final da tarefa movida. */
  position: number;
  /** Outras tarefas da coluna que mudam de posição. Vazio, exceto quando a coluna é renumerada. */
  renumber: PositionedTask[];
}

/**
 * Função pura: não usa banco nem HTTP. `column` são as tarefas da coluna de destino SEM a tarefa movida.
 *
 * Os vizinhos vêm do cliente, que pode estar com uma visão antiga do quadro. Se eles não batem com a
 * coluna atual, a movimentação é recusada com 409 (`POSITION_CHANGED`) e o cliente deve recarregar.
 */
export function placeInColumn(column: PositionedTask[], neighbors: MoveNeighbors): Placement {
  const sorted = [...column].sort((a, b) => a.position - b.position);
  const index = insertionIndex(sorted, neighbors);
  const lower = sorted[index - 1]?.position;
  const upper = sorted[index]?.position;

  if (lower !== undefined && upper !== undefined && upper - lower < MIN_POSITION_GAP) {
    return renumberAround(sorted, index);
  }
  return { position: midpoint(lower, upper), renumber: [] };
}

function insertionIndex(sorted: PositionedTask[], { beforeTaskId, afterTaskId }: MoveNeighbors): number {
  if (beforeTaskId !== null && afterTaskId !== null) {
    const i = indexOf(sorted, beforeTaskId);
    if (sorted[i + 1]?.id !== afterTaskId) throw stale();
    return i + 1;
  }
  if (beforeTaskId !== null) return indexOf(sorted, beforeTaskId) + 1;
  if (afterTaskId !== null) return indexOf(sorted, afterTaskId);
  return sorted.length;
}

function indexOf(sorted: PositionedTask[], id: string): number {
  const i = sorted.findIndex((t) => t.id === id);
  if (i === -1) throw stale();
  return i;
}

/** Entre dois valores, o meio. Nas pontas, um passo para fora. Coluna vazia: posição 1. */
function midpoint(lower: number | undefined, upper: number | undefined): number {
  if (upper === undefined) return lower === undefined ? 1 : lower + 1;
  if (lower === undefined) return upper - 1;
  return (lower + upper) / 2;
}

/** Renumera a coluna em 1, 2, 3… deixando um espaço vazio na posição do cartão movido. */
function renumberAround(sorted: PositionedTask[], index: number): Placement {
  return {
    position: index + 1,
    renumber: sorted.map((t, i) => ({ id: t.id, position: i < index ? i + 1 : i + 2 })),
  };
}

function stale() {
  return new ConflictError(
    'O quadro mudou enquanto você movia a tarefa. Atualize e tente de novo.',
    'POSITION_CHANGED',
  );
}
