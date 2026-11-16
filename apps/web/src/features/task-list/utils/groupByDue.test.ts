import { task } from '@/mocks/fixtures';
import { groupByDue } from './groupByDue';

// Quarta-feira: a semana vai até domingo, 15 nov
const today = '2026-11-11';
const withDue = (id: string, dueDate: string | null) => ({ ...task, id, dueDate });

describe('groupByDue', () => {
  it('separa em vencidas, nesta semana, mais adiante e sem prazo', () => {
    const groups = groupByDue(
      [
        withDue('later', '2026-11-16'),
        withDue('none', null),
        withDue('week', '2026-11-15'),
        withDue('today', '2026-11-11'),
        withDue('late', '2026-11-10'),
      ],
      today,
    );

    expect(groups.map((group) => [group.label, group.tasks.map((t) => t.id)])).toEqual([
      ['Vencidas', ['late']],
      ['Nesta semana', ['today', 'week']],
      ['Mais adiante', ['later']],
      ['Sem prazo', ['none']],
    ]);
  });

  it('omite os grupos vazios', () => {
    expect(groupByDue([withDue('none', null)], today).map((group) => group.id)).toEqual(['noDueDate']);
    expect(groupByDue([], today)).toEqual([]);
  });

  it('tarefa concluída com prazo passado não conta como vencida', () => {
    const [group] = groupByDue([{ ...withDue('done', '2026-11-10'), status: 'done' }], today);
    expect(group?.id).toBe('thisWeek');
  });
});
