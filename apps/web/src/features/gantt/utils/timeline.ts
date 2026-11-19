import type { Task, TaskDependency } from '@clickunicap/shared';
import { addDays, differenceInCalendarDays, format, isWeekend, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

/** Largura de um dia e altura de uma linha, em px. O SVG das setas usa as mesmas medidas. */
export const DAY_WIDTH = 32;
export const ROW_HEIGHT = 48;

/** Folga antes da primeira data e depois da última, e tamanho mínimo da linha do tempo. */
const PADDING_BEFORE = 3;
const PADDING_AFTER = 7;
const MIN_DAYS = 28;
/** Teto da linha do tempo: uma data digitada errado (2099) não pode virar milhares de colunas. */
export const MAX_DAYS = 730;
/** Hoje só entra na linha do tempo se estiver a até 90 dias das tarefas. */
const TODAY_REACH = 90;

export interface GanttBar {
  /** Datas reais da tarefa. */
  start: string;
  end: string;
  /** Índice do dia em que a barra começa, a partir do início da linha do tempo (já cortado no teto). */
  offset: number;
  /** Quantos dias a barra ocupa na tela (início e fim inclusos). */
  span: number;
}

export interface GanttRow {
  task: Task;
  /** null quando a tarefa não tem início nem prazo. */
  bar: GanttBar | null;
}

export interface GanttDay {
  iso: string;
  label: string;
  weekend: boolean;
}

export interface GanttMonth {
  label: string;
  span: number;
}

export interface Timeline {
  start: string;
  days: GanttDay[];
  months: GanttMonth[];
  rows: GanttRow[];
  /** Índice de hoje na linha do tempo, ou null quando hoje fica longe das tarefas. */
  todayIndex: number | null;
}

/**
 * Sem início, a barra é só o dia do prazo; sem prazo, só o dia do início.
 * Datas ISO (AAAA-MM-DD) comparam certo como texto.
 */
export function taskDates(task: Pick<Task, 'startDate' | 'dueDate'>): { start: string; end: string } | null {
  const start = task.startDate ?? task.dueDate;
  const end = task.dueDate ?? task.startDate;
  return start && end ? { start, end } : null;
}

const minIso = (values: string[]) => values.reduce((a, b) => (b < a ? b : a));
const maxIso = (values: string[]) => values.reduce((a, b) => (b > a ? b : a));
const toIso = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Monta a linha do tempo: vai de alguns dias antes da primeira data até uma semana depois da última.
 * Hoje entra quando está perto das tarefas. Tarefas com datas vêm primeiro, por início e prazo;
 * as sem datas, no fim. Com mais de MAX_DAYS dias, as barras que passam do fim são cortadas.
 */
export function buildTimeline(tasks: Task[], today: string): Timeline {
  const dated = tasks.flatMap((task) => {
    const dates = taskDates(task);
    return dates ? [{ task, ...dates }] : [];
  });

  let first = dated.length ? minIso(dated.map((d) => d.start)) : today;
  let last = dated.length ? maxIso(dated.map((d) => d.end)) : today;
  const reach = (from: string, days: number) => toIso(addDays(parseISO(from), days));
  if (today >= reach(first, -TODAY_REACH) && today <= reach(last, TODAY_REACH)) {
    first = minIso([first, today]);
    last = maxIso([last, today]);
  }

  const startDate = addDays(parseISO(first), -PADDING_BEFORE);
  const wanted = differenceInCalendarDays(parseISO(last), startDate) + 1 + PADDING_AFTER;
  const total = Math.min(Math.max(wanted, MIN_DAYS), MAX_DAYS);

  const days: GanttDay[] = Array.from({ length: total }, (_, index) => {
    const date = addDays(startDate, index);
    return { iso: toIso(date), label: format(date, 'd'), weekend: isWeekend(date) };
  });

  const months: GanttMonth[] = [];
  for (let index = 0; index < total; index++) {
    const label = format(addDays(startDate, index), 'MMMM yyyy', { locale: ptBR });
    const current = months[months.length - 1];
    if (current?.label === label) current.span += 1;
    else months.push({ label, span: 1 });
  }

  const offsetOf = (iso: string) => differenceInCalendarDays(parseISO(iso), startDate);
  const toBar = (start: string, end: string): GanttBar | null => {
    const from = offsetOf(start);
    const to = Math.min(offsetOf(end), total - 1);
    return from > to ? null : { start, end, offset: from, span: to - from + 1 };
  };
  const todayOffset = offsetOf(today);
  const byDates = [...dated].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const undated = tasks.filter((task) => !taskDates(task));

  return {
    start: toIso(startDate),
    days,
    months,
    todayIndex: todayOffset >= 0 && todayOffset < total ? todayOffset : null,
    rows: [
      ...byDates.map(({ task, start, end }) => ({ task, bar: toBar(start, end) })),
      ...undated.map((task) => ({ task, bar: null })),
    ],
  };
}

export interface DependencyArrow {
  key: string;
  /** Caminho SVG da seta, do fim da barra que bloqueia ao início da barra que espera. */
  path: string;
  /** A tarefa que espera começa antes do último dia da que bloqueia (no mesmo dia vale). */
  conflict: boolean;
  from: Task;
  to: Task;
}

/** Folga horizontal da seta antes de dobrar. */
const ELBOW = 8;

/** Setas das dependências em que as duas tarefas aparecem na linha do tempo com barra. */
export function dependencyArrows(rows: GanttRow[], dependencies: TaskDependency[]): DependencyArrow[] {
  const index = new Map(rows.map((row, i) => [row.task.id, i]));

  return dependencies.flatMap((dep) => {
    const fromIndex = index.get(dep.dependsOnTaskId);
    const toIndex = index.get(dep.taskId);
    if (fromIndex === undefined || toIndex === undefined) return [];
    const from = rows[fromIndex];
    const to = rows[toIndex];
    if (!from?.bar || !to?.bar) return [];

    const x1 = (from.bar.offset + from.bar.span) * DAY_WIDTH;
    const y1 = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x2 = to.bar.offset * DAY_WIDTH;
    const y2 = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Com espaço, a seta sai, desce e entra. Sem espaço, contorna pela borda entre as linhas.
    const path =
      x2 - x1 >= ELBOW * 2
        ? `M ${x1} ${y1} H ${x1 + ELBOW} V ${y2} H ${x2}`
        : `M ${x1} ${y1} H ${x1 + ELBOW} V ${y2 + (y2 > y1 ? -1 : 1) * (ROW_HEIGHT / 2)} H ${x2 - ELBOW} V ${y2} H ${x2}`;

    return [
      {
        key: `${dep.taskId}-${dep.dependsOnTaskId}`,
        path,
        conflict: to.bar.start < from.bar.end,
        from: from.task,
        to: to.task,
      },
    ];
  });
}
