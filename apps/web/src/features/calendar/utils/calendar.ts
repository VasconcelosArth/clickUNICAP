/**
 * Utilitários de calendário.
 *
 * Funções puras para calcular a grade mensal (ou semanal) e posicionar
 * tarefas nos dias corretos. Não dependem de React.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { Task } from '@clickunicap/shared';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Visão atual do calendário: mês completo ou semana. */
export type CalendarView = 'month' | 'week';

/** Um dia dentro da grade do calendário. */
export interface CalendarDay {
  /** Data no formato ISO (AAAA-MM-DD). */
  iso: string;
  /** Data nativa JavaScript, mantida para cálculos locais. */
  date: Date;
  /** True quando o dia pertence ao mês "atual" da grade. */
  isCurrentMonth: boolean;
  /** True quando é hoje (data local do dispositivo). */
  isToday: boolean;
  /** Tarefas cujo prazo (dueDate) cai neste dia. */
  tasks: Task[];
}

// ---------------------------------------------------------------------------
// Helpers de navegação
// ---------------------------------------------------------------------------

/** Avança ou retrocede um período de acordo com a visão ativa. */
export function navigate(current: Date, direction: 'prev' | 'next', view: CalendarView): Date {
  if (view === 'month') {
    return direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1);
  }
  return direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1);
}

/** Volta ao período que contém hoje. */
export function goToToday(): Date {
  return new Date();
}

// ---------------------------------------------------------------------------
// Geração da grade
// ---------------------------------------------------------------------------

/**
 * Retorna os dias que compõem a grade do calendário.
 *
 * Visão mensal: 42 células (6 semanas × 7 dias), começando na segunda-feira
 * da semana que contém o 1º do mês e terminando no domingo da semana que
 * contém o último dia.
 *
 * Visão semanal: 7 dias, da segunda ao domingo da semana que contém a data de
 * referência.
 */
export function buildCalendarGrid(reference: Date, view: CalendarView): CalendarDay[] {
  const today = new Date();

  let start: Date;
  let end: Date;

  if (view === 'month') {
    start = startOfWeek(startOfMonth(reference), { weekStartsOn: 1 });
    end = endOfWeek(endOfMonth(reference), { weekStartsOn: 1 });
  } else {
    start = startOfWeek(reference, { weekStartsOn: 1 });
    end = endOfWeek(reference, { weekStartsOn: 1 });
  }

  return eachDayOfInterval({ start, end }).map((date) => ({
    iso: format(date, 'yyyy-MM-dd'),
    date,
    isCurrentMonth: view === 'month' ? isSameMonth(date, reference) : true,
    isToday: isSameDay(date, today),
    tasks: [],
  }));
}

// ---------------------------------------------------------------------------
// Distribuição das tarefas nos dias
// ---------------------------------------------------------------------------

/**
 * Injeta as tarefas nos dias correspondentes ao prazo (dueDate).
 *
 * Uma tarefa sem prazo não aparece no calendário.
 * Uma tarefa com prazo é exibida no dia do seu vencimento.
 *
 * Retorna uma nova lista de dias para evitar mutações.
 */
export function placeTasks(days: CalendarDay[], tasks: Task[]): CalendarDay[] {
  // Indexa os dias pelo ISO para busca O(1)
  const index = new Map<string, CalendarDay>();
  for (const day of days) {
    index.set(day.iso, { ...day, tasks: [] });
  }

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const day = index.get(task.dueDate);
    if (day) {
      day.tasks.push(task);
    }
  }

  return days.map((d) => index.get(d.iso) ?? d);
}

// ---------------------------------------------------------------------------
// Rótulos de período
// ---------------------------------------------------------------------------

/** "novembro 2026" (mês + ano em pt-BR, capitalizado). */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: ptBR });
}

/** "11 – 17 nov 2026" (intervalo da semana em pt-BR). */
export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
    return `${format(start, 'd')} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
  }
  return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
}

/** Rótulos curtos dos dias da semana em pt-BR: "Seg", "Ter", … */
export const WEEK_DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Avança um dia (usado em testes). */
export { addDays, parseISO };
