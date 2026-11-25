/**
 * Testes unitários dos utilitários de calendário.
 *
 * Cobrem: geração da grade, posicionamento de tarefas,
 * navegação e formatação de rótulos.
 */

import type { Task } from '@clickunicap/shared';
import { task as baseTask } from '@/mocks/fixtures';
import { buildCalendarGrid, formatMonthYear, formatWeekRange, navigate, placeTasks, WEEK_DAY_LABELS } from './calendar';

// ---------------------------------------------------------------------------
// Helpers de teste
// ---------------------------------------------------------------------------

function makeDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`); // meio-dia local para evitar edge cases de fuso
}

function makeTask(overrides: Partial<Task>): Task {
  return { ...baseTask, ...overrides };
}

// ---------------------------------------------------------------------------
// buildCalendarGrid — visão mensal
// ---------------------------------------------------------------------------

describe('buildCalendarGrid (month)', () => {
  it('retorna 35 ou 42 células (5 ou 6 semanas)', () => {
    // Novembro 2026: começa numa domingo → semana da grade começa na seg 26/out
    const grid = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    expect(grid.length % 7).toBe(0);
    expect(grid.length).toBeGreaterThanOrEqual(28);
    expect(grid.length).toBeLessThanOrEqual(42);
  });

  it('o primeiro dia da grade é uma segunda-feira', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    // 0 = domingo, 1 = segunda
    expect(grid[0]?.date.getDay()).toBe(1);
  });

  it('marca corretamente os dias do mês atual e os de outros meses', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const novDays = grid.filter((d) => d.isCurrentMonth);
    expect(novDays).toHaveLength(30); // novembro tem 30 dias
  });

  it('marca apenas um dia como hoje', () => {
    const grid = buildCalendarGrid(new Date(), 'month');
    expect(grid.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('a grade começa sem tarefas', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    expect(grid.every((d) => d.tasks.length === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildCalendarGrid — visão semanal
// ---------------------------------------------------------------------------

describe('buildCalendarGrid (week)', () => {
  it('retorna exatamente 7 dias', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-25'), 'week');
    expect(grid).toHaveLength(7);
  });

  it('começa na segunda e termina no domingo da semana de referência', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-25'), 'week'); // 25 nov = quarta
    expect(grid[0]?.iso).toBe('2026-11-23'); // segunda
    expect(grid[6]?.iso).toBe('2026-11-29'); // domingo
  });

  it('marca todos os dias como isCurrentMonth=true na visão semanal', () => {
    const grid = buildCalendarGrid(makeDate('2026-11-25'), 'week');
    expect(grid.every((d) => d.isCurrentMonth)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// placeTasks
// ---------------------------------------------------------------------------

describe('placeTasks', () => {
  it('coloca cada tarefa no dia correto do prazo', () => {
    const days = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const t = makeTask({ dueDate: '2026-11-10' });
    const result = placeTasks(days, [t]);
    const day10 = result.find((d) => d.iso === '2026-11-10');
    expect(day10?.tasks).toHaveLength(1);
    expect(day10?.tasks[0]?.id).toBe(t.id);
  });

  it('ignora tarefas sem prazo', () => {
    const days = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const t = makeTask({ dueDate: null });
    const result = placeTasks(days, [t]);
    expect(result.every((d) => d.tasks.length === 0)).toBe(true);
  });

  it('ignora tarefas cujo prazo está fora do intervalo da grade', () => {
    const days = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const t = makeTask({ dueDate: '2027-01-05' });
    const result = placeTasks(days, [t]);
    expect(result.every((d) => d.tasks.length === 0)).toBe(true);
  });

  it('acumula múltiplas tarefas no mesmo dia', () => {
    const days = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const t1 = makeTask({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dueDate: '2026-11-15' });
    const t2 = makeTask({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', dueDate: '2026-11-15' });
    const result = placeTasks(days, [t1, t2]);
    const day15 = result.find((d) => d.iso === '2026-11-15');
    expect(day15?.tasks).toHaveLength(2);
  });

  it('não muta a lista original de dias', () => {
    const days = buildCalendarGrid(makeDate('2026-11-01'), 'month');
    const t = makeTask({ dueDate: '2026-11-01' });
    placeTasks(days, [t]);
    expect(days[0]?.tasks).toHaveLength(0); // original não foi alterado
  });
});

// ---------------------------------------------------------------------------
// navigate
// ---------------------------------------------------------------------------

describe('navigate', () => {
  it('avança um mês na visão mensal', () => {
    const result = navigate(makeDate('2026-11-01'), 'next', 'month');
    expect(result.getMonth()).toBe(11); // dezembro
  });

  it('retrocede um mês na visão mensal', () => {
    const result = navigate(makeDate('2026-11-01'), 'prev', 'month');
    expect(result.getMonth()).toBe(9); // outubro
  });

  it('avança uma semana na visão semanal', () => {
    const ref = makeDate('2026-11-25'); // quarta
    const result = navigate(ref, 'next', 'week');
    // 25 nov + 7 dias = 2 dez
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(11); // dezembro (0-based)
  });

  it('retrocede uma semana na visão semanal', () => {
    const ref = makeDate('2026-11-25');
    const result = navigate(ref, 'prev', 'week');
    expect(result.getDate()).toBe(18); // 18 nov
  });
});

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

describe('formatMonthYear', () => {
  it('formata em português com letra minúscula', () => {
    expect(formatMonthYear(makeDate('2026-11-01'))).toMatch(/novembro 2026/i);
  });
});

describe('formatWeekRange', () => {
  it('exibe o intervalo dentro do mesmo mês', () => {
    // Semana de 23 a 29 nov
    expect(formatWeekRange(makeDate('2026-11-25'))).toMatch(/23/);
    expect(formatWeekRange(makeDate('2026-11-25'))).toMatch(/29/);
  });
});

describe('WEEK_DAY_LABELS', () => {
  it('tem 7 rótulos começando por Seg', () => {
    expect(WEEK_DAY_LABELS).toHaveLength(7);
    expect(WEEK_DAY_LABELS[0]).toBe('Seg');
    expect(WEEK_DAY_LABELS[6]).toBe('Dom');
  });
});
