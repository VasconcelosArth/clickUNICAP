import type { Task } from '@clickunicap/shared';
import { task as baseTask } from '@/mocks/fixtures';
import { DAY_WIDTH, MAX_DAYS, ROW_HEIGHT, buildTimeline, dependencyArrows, taskDates } from './timeline';

const make = (id: string, startDate: string | null, dueDate: string | null): Task => ({
  ...baseTask,
  id,
  title: id,
  startDate,
  dueDate,
});
const dep = (taskId: string, dependsOnTaskId: string) => ({
  taskId,
  dependsOnTaskId,
  createdAt: '2026-11-04T12:00:00.000Z',
});

describe('taskDates', () => {
  it('usa início e prazo; sem um deles, a barra vira um dia só', () => {
    expect(taskDates({ startDate: '2026-11-02', dueDate: '2026-11-05' })).toEqual({
      start: '2026-11-02',
      end: '2026-11-05',
    });
    expect(taskDates({ startDate: null, dueDate: '2026-11-05' })).toEqual({ start: '2026-11-05', end: '2026-11-05' });
    expect(taskDates({ startDate: '2026-11-02', dueDate: null })).toEqual({ start: '2026-11-02', end: '2026-11-02' });
    expect(taskDates({ startDate: null, dueDate: null })).toBeNull();
  });
});

describe('buildTimeline', () => {
  it('começa 3 dias antes da primeira data e tem no mínimo 28 dias', () => {
    const t = buildTimeline([make('a', '2026-11-10', '2026-11-12')], '2026-11-10');
    expect(t.start).toBe('2026-11-07');
    expect(t.days).toHaveLength(28);
    expect(t.todayIndex).toBe(3);
    expect(t.rows[0]?.bar).toEqual({ start: '2026-11-10', end: '2026-11-12', offset: 3, span: 3 });
  });

  it('sempre inclui hoje, mesmo com tarefas só no futuro', () => {
    const t = buildTimeline([make('a', '2026-12-20', '2026-12-31')], '2026-11-19');
    expect(t.start).toBe('2026-11-16');
    expect(t.todayIndex).toBe(3);
    // até 31/12 mais uma semana de folga
    expect(t.days[t.days.length - 1]?.iso).toBe('2027-01-07');
  });

  it('ordena por início e põe as tarefas sem datas no fim', () => {
    const t = buildTimeline(
      [make('sem-data', null, null), make('depois', '2026-11-12', null), make('antes', null, '2026-11-08')],
      '2026-11-10',
    );
    expect(t.rows.map((r) => r.task.id)).toEqual(['antes', 'depois', 'sem-data']);
    expect(t.rows[2]?.bar).toBeNull();
  });

  it('agrupa os dias por mês para o cabeçalho e marca fim de semana', () => {
    const t = buildTimeline([make('a', '2026-11-25', '2026-12-03')], '2026-11-25');
    expect(t.months.map((m) => m.label)).toEqual(['novembro 2026', 'dezembro 2026']);
    expect(t.months.reduce((sum, m) => sum + m.span, 0)).toBe(t.days.length);
    // 28/11/2026 é sábado
    expect(t.days.find((d) => d.iso === '2026-11-28')?.weekend).toBe(true);
    expect(t.days.find((d) => d.iso === '2026-11-27')?.weekend).toBe(false);
  });

  it('não estica até hoje quando as tarefas estão longe (mais de 90 dias)', () => {
    const t = buildTimeline([make('a', '2099-01-02', '2099-01-05')], '2026-11-19');
    expect(t.start).toBe('2098-12-30');
    expect(t.days).toHaveLength(28);
    expect(t.todayIndex).toBeNull();
  });

  it('limita a linha do tempo e corta a barra que passa do fim', () => {
    const t = buildTimeline(
      [make('a', '2026-11-10', '2026-11-12'), make('b', '2026-11-20', '2031-01-01')],
      '2026-11-10',
    );
    expect(t.days).toHaveLength(MAX_DAYS);
    const bar = t.rows[1]?.bar;
    expect(bar).toMatchObject({ start: '2026-11-20', end: '2031-01-01', offset: 13 });
    expect((bar?.offset ?? 0) + (bar?.span ?? 0)).toBe(MAX_DAYS);
  });

  it('sem tarefas, mostra as próximas semanas a partir de hoje', () => {
    const t = buildTimeline([], '2026-11-19');
    expect(t.rows).toEqual([]);
    expect(t.days).toHaveLength(28);
    expect(t.todayIndex).toBe(3);
  });
});

describe('dependencyArrows', () => {
  const tasks = [make('a', '2026-11-10', '2026-11-11'), make('b', '2026-11-14', '2026-11-15')];

  it('liga o fim da barra que bloqueia ao início da que espera', () => {
    const { rows } = buildTimeline(tasks, '2026-11-10');
    const [arrow] = dependencyArrows(rows, [dep('b', 'a')]);

    const x1 = (3 + 2) * DAY_WIDTH; // a começa no índice 3 e dura 2 dias
    const x2 = 7 * DAY_WIDTH; // b começa no índice 7
    expect(arrow).toMatchObject({ conflict: false, from: { id: 'a' }, to: { id: 'b' } });
    expect(arrow?.path).toBe(`M ${x1} ${ROW_HEIGHT / 2} H ${x1 + 8} V ${ROW_HEIGHT * 1.5} H ${x2}`);
  });

  it('marca conflito quando a tarefa que espera começa antes de a outra terminar', () => {
    const { rows } = buildTimeline(
      [make('a', '2026-11-10', '2026-11-15'), make('b', '2026-11-12', null)],
      '2026-11-10',
    );
    const [arrow] = dependencyArrows(rows, [dep('b', 'a')]);
    expect(arrow?.conflict).toBe(true);
    // sem espaço para a seta descer direto, ela contorna pela borda entre as linhas
    expect(arrow?.path.split('V')).toHaveLength(3);
  });

  it('começar no mesmo dia em que a outra termina não é conflito', () => {
    const { rows } = buildTimeline(
      [make('a', '2026-11-10', '2026-11-12'), make('b', '2026-11-12', null)],
      '2026-11-10',
    );
    expect(dependencyArrows(rows, [dep('b', 'a')])[0]?.conflict).toBe(false);
  });

  it('ignora dependências com tarefa sem barra ou fora da lista (filtrada)', () => {
    const { rows } = buildTimeline([...tasks, make('c', null, null)], '2026-11-10');
    expect(dependencyArrows(rows, [dep('c', 'a'), dep('b', 'fora-do-filtro')])).toEqual([]);
  });
});
