import { ConflictError } from '@/core/errors';
import { MIN_POSITION_GAP, placeInColumn } from './position';

const col = (...positions: number[]) => positions.map((position, i) => ({ id: `t${i + 1}`, position }));
const none = { beforeTaskId: null, afterTaskId: null };

/** Devolve o erro lançado pela função (ou undefined). */
const capture = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
};

describe('placeInColumn', () => {
  it('coluna vazia: posição 1', () => {
    expect(placeInColumn([], none)).toEqual({ position: 1, renumber: [] });
  });

  it('sem vizinhos entra no fim da coluna', () => {
    expect(placeInColumn(col(1, 2, 5), none).position).toBe(6);
  });

  it('antes do primeiro: uma posição abaixo dele', () => {
    expect(placeInColumn(col(1, 2), { beforeTaskId: null, afterTaskId: 't1' }).position).toBe(0);
  });

  it('depois do último: uma posição acima dele', () => {
    expect(placeInColumn(col(1, 2), { beforeTaskId: 't2', afterTaskId: null }).position).toBe(3);
  });

  it('entre dois vizinhos: o ponto do meio (1 e 2 → 1.5)', () => {
    expect(placeInColumn(col(1, 2), { beforeTaskId: 't1', afterTaskId: 't2' })).toEqual({
      position: 1.5,
      renumber: [],
    });
  });

  it('ordena a coluna antes de calcular, mesmo que venha desordenada', () => {
    const shuffled = [
      { id: 'c', position: 3 },
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ];
    expect(placeInColumn(shuffled, { beforeTaskId: 'a', afterTaskId: 'b' }).position).toBe(1.5);
  });

  it('vizinhos que não são adjacentes → POSITION_CHANGED (o quadro mudou)', () => {
    expect(capture(() => placeInColumn(col(1, 2, 3), { beforeTaskId: 't1', afterTaskId: 't3' }))).toBeInstanceOf(
      ConflictError,
    );
    expect(capture(() => placeInColumn(col(1, 2, 3), { beforeTaskId: 't1', afterTaskId: 't3' }))).toMatchObject({
      code: 'POSITION_CHANGED',
    });
  });

  it('vizinho que não está na coluna de destino → POSITION_CHANGED', () => {
    expect(capture(() => placeInColumn(col(1), { beforeTaskId: 'fantasma', afterTaskId: null }))).toMatchObject({
      code: 'POSITION_CHANGED',
    });
    expect(capture(() => placeInColumn(col(1), { beforeTaskId: null, afterTaskId: 'fantasma' }))).toMatchObject({
      code: 'POSITION_CHANGED',
    });
  });

  it('afterTaskId primeiro na coluna: entra no início', () => {
    expect(placeInColumn(col(4, 5), { beforeTaskId: null, afterTaskId: 't1' }).position).toBe(3);
  });

  it('gap menor que MIN_POSITION_GAP renumera a coluna em 1, 2, 3…', () => {
    const tight = [
      { id: 'a', position: 1 },
      { id: 'b', position: 1 + MIN_POSITION_GAP / 2 },
      { id: 'c', position: 5 },
    ];
    const placement = placeInColumn(tight, { beforeTaskId: 'a', afterTaskId: 'b' });
    expect(placement.position).toBe(2);
    expect(placement.renumber).toEqual([
      { id: 'a', position: 1 },
      { id: 'b', position: 3 },
      { id: 'c', position: 4 },
    ]);
  });

  it('a posição escolhida fica estritamente entre os vizinhos depois de muitas inserções', () => {
    // Insere sempre entre "a" e o último cartão inserido: o espaço cai pela metade a cada passo.
    let column: { id: string; position: number }[] = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ];
    let upper = 'b';
    for (let i = 0; i < 40; i++) {
      const id = `x${i}`;
      const placement = placeInColumn(column, { beforeTaskId: 'a', afterTaskId: upper });
      const renumbered = new Map(placement.renumber.map((r) => [r.id, r.position]));
      column = [
        ...column.map((t) => ({ id: t.id, position: renumbered.get(t.id) ?? t.position })),
        { id, position: placement.position },
      ];
      upper = id;
    }
    const sorted = [...column].sort((x, y) => x.position - y.position);
    expect(sorted.map((t) => t.id)[0]).toBe('a');
    expect(sorted.map((t) => t.id).at(-1)).toBe('b');
    const positions = sorted.map((t) => t.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
  });
});
