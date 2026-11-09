import { task } from '@/mocks/fixtures';
import { groupByStatus, isOverdue, summarizeTasks } from './tasks';

// Uma segunda-feira: a semana vai até 15/11
const TODAY = '2026-11-09';

describe('isOverdue', () => {
  it('marca tarefa aberta com prazo passado', () => {
    expect(isOverdue({ status: 'todo', dueDate: '2026-11-08' }, TODAY)).toBe(true);
  });

  it('não marca o prazo de hoje, tarefa concluída nem tarefa sem prazo', () => {
    expect(isOverdue({ status: 'todo', dueDate: TODAY }, TODAY)).toBe(false);
    expect(isOverdue({ status: 'done', dueDate: '2026-11-08' }, TODAY)).toBe(false);
    expect(isOverdue({ status: 'todo', dueDate: null }, TODAY)).toBe(false);
  });
});

describe('groupByStatus', () => {
  it('devolve sempre as três colunas, na ordem fixa', () => {
    const groups = groupByStatus([{ ...task, status: 'done' }]);

    expect(groups.map((group) => [group.status, group.tasks.length])).toEqual([
      ['todo', 0],
      ['in_progress', 0],
      ['done', 1],
    ]);
  });
});

describe('summarizeTasks', () => {
  it('calcula progresso, vencidas e as que vencem na semana', () => {
    const summary = summarizeTasks(
      [
        { ...task, id: 'a', status: 'done', dueDate: '2026-11-01' },
        { ...task, id: 'b', status: 'todo', dueDate: '2026-11-08' },
        { ...task, id: 'c', status: 'todo', dueDate: '2026-11-15' },
        { ...task, id: 'd', status: 'todo', dueDate: '2026-11-16' },
      ],
      TODAY,
    );

    expect(summary).toEqual({ total: 4, done: 1, progress: 25, overdue: 1, dueThisWeek: 1, weekEnd: '2026-11-15' });
  });

  it('não divide por zero em projeto vazio', () => {
    expect(summarizeTasks([], TODAY).progress).toBe(0);
  });
});
