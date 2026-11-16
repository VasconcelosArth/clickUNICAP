import type { Task, TaskStatus } from '@clickunicap/shared';
import { task } from '@/mocks/fixtures';
import { applyMove, columnDropId, findColumn, isSamePlace, moveCard, moveInputFor, toColumns } from './board';

const card = (id: string, status: TaskStatus): Task => ({ ...task, id, status });
const tasks = [card('a', 'todo'), card('b', 'todo'), card('c', 'todo'), card('d', 'in_progress')];
const ids = (list: Task[]) => list.map((t) => t.id);

describe('board', () => {
  it('monta as três colunas, mesmo vazias', () => {
    const columns = toColumns(tasks);
    expect(ids(columns.todo)).toEqual(['a', 'b', 'c']);
    expect(ids(columns.in_progress)).toEqual(['d']);
    expect(columns.done).toEqual([]);
  });

  it('acha a coluna de um cartão e de um droppable de coluna', () => {
    const columns = toColumns(tasks);
    expect(findColumn(columns, 'd')).toBe('in_progress');
    expect(findColumn(columns, columnDropId('done'))).toBe('done');
    expect(findColumn(columns, 'x')).toBeUndefined();
  });

  describe('moveCard', () => {
    it('reordena na mesma coluna', () => {
      expect(ids(moveCard(toColumns(tasks), 'a', 'c').todo)).toEqual(['b', 'c', 'a']);
    });

    it('leva para outra coluna no lugar do cartão de destino e troca o status', () => {
      const next = moveCard(toColumns(tasks), 'b', 'd');
      expect(ids(next.todo)).toEqual(['a', 'c']);
      expect(ids(next.in_progress)).toEqual(['b', 'd']);
      expect(next.in_progress[0]?.status).toBe('in_progress');
    });

    it('soltar na coluna (vazia ou abaixo do último) põe no fim', () => {
      expect(ids(moveCard(toColumns(tasks), 'a', columnDropId('done')).done)).toEqual(['a']);
      expect(ids(moveCard(toColumns(tasks), 'a', columnDropId('in_progress')).in_progress)).toEqual(['d', 'a']);
    });
  });

  describe('moveInputFor', () => {
    it('sem filtro manda os dois vizinhos', () => {
      const columns = moveCard(toColumns(tasks), 'd', 'b');
      expect(moveInputFor(columns, 'd', false)).toEqual({ status: 'todo', beforeTaskId: 'a', afterTaskId: 'b' });
    });

    it('nas pontas e na coluna vazia usa null', () => {
      expect(moveInputFor(toColumns(tasks), 'a', false)).toEqual({
        status: 'todo',
        beforeTaskId: null,
        afterTaskId: 'b',
      });
      const columns = moveCard(toColumns(tasks), 'a', columnDropId('done'));
      expect(moveInputFor(columns, 'a', false)).toEqual({ status: 'done', beforeTaskId: null, afterTaskId: null });
    });

    it('com filtro manda um vizinho só', () => {
      const columns = toColumns(tasks);
      expect(moveInputFor(columns, 'b', true)).toEqual({ status: 'todo', beforeTaskId: 'a', afterTaskId: null });
      expect(moveInputFor(columns, 'a', true)).toEqual({ status: 'todo', beforeTaskId: null, afterTaskId: 'b' });
    });
  });

  it('isSamePlace percebe quando o cartão não saiu do lugar', () => {
    const columns = toColumns(tasks);
    expect(isSamePlace(columns, columns, 'b')).toBe(true);
    expect(isSamePlace(columns, moveCard(columns, 'b', 'c'), 'b')).toBe(false);
    expect(isSamePlace(columns, moveCard(columns, 'b', 'd'), 'b')).toBe(false);
  });

  describe('applyMove', () => {
    it('põe depois do vizinho de cima, com o novo status', () => {
      const next = applyMove(tasks, 'd', { status: 'todo', beforeTaskId: 'a', afterTaskId: 'b' });
      expect(ids(next)).toEqual(['a', 'd', 'b', 'c']);
      expect(next[1]?.status).toBe('todo');
    });

    it('sem o vizinho de cima, põe antes do de baixo', () => {
      expect(ids(applyMove(tasks, 'c', { status: 'todo', beforeTaskId: null, afterTaskId: 'a' }))).toEqual([
        'c',
        'a',
        'b',
        'd',
      ]);
    });

    it('sem vizinhos, vai para o fim da coluna (ou da lista, se a coluna está vazia)', () => {
      expect(ids(applyMove(tasks, 'd', { status: 'todo', beforeTaskId: null, afterTaskId: null }))).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
      expect(ids(applyMove(tasks, 'a', { status: 'done', beforeTaskId: null, afterTaskId: null }))).toEqual([
        'b',
        'c',
        'd',
        'a',
      ]);
    });

    it('ignora tarefa que não está na lista (outro filtro)', () => {
      expect(applyMove(tasks, 'x', { status: 'done', beforeTaskId: null, afterTaskId: null })).toBe(tasks);
    });
  });
});
