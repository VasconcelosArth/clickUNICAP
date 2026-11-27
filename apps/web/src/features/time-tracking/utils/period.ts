import { MAX_TIME_REPORT_DAYS, type TimeReportQuery } from '@clickunicap/shared';
import { addDays, differenceInCalendarDays, format, isValid, parse } from 'date-fns';

/** Período do relatório em dias inteiros (AAAA-MM-DD), com os dois extremos incluídos, como aparece na tela. */
export interface DayRange {
  from: string;
  to: string;
}

/** Quantos dias o relatório mostra quando a URL não diz o período. */
export const DEFAULT_REPORT_DAYS = 30;

const DAY_FORMAT = 'yyyy-MM-dd';

function parseDay(value: string | null): Date | null {
  if (!value) return null;
  const day = parse(value, DAY_FORMAT, new Date());
  return isValid(day) && format(day, DAY_FORMAT) === value ? day : null;
}

/** Os últimos 30 dias, contando hoje. */
export function defaultRange(today: string): DayRange {
  const end = parseDay(today) ?? new Date();
  return { from: format(addDays(end, 1 - DEFAULT_REPORT_DAYS), DAY_FORMAT), to: format(end, DAY_FORMAT) };
}

/** Lê o período da URL. Data ausente ou inválida vira a do período padrão. */
export function readRange(from: string | null, to: string | null, today: string): DayRange {
  const fallback = defaultRange(today);
  return {
    from: parseDay(from) ? (from as string) : fallback.from,
    to: parseDay(to) ? (to as string) : fallback.to,
  };
}

/** Mensagem do período que não pode ser consultado, ou `null`. */
export function rangeError(range: DayRange): string | null {
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  if (!from || !to) return 'Informe as duas datas';
  const days = differenceInCalendarDays(to, from) + 1;
  if (days < 1) return 'A data final precisa ser igual ou depois da inicial';
  if (days > MAX_TIME_REPORT_DAYS) return `O período pode ter no máximo ${MAX_TIME_REPORT_DAYS} dias`;
  return null;
}

/**
 * Converte os dias da tela no período da API, no fuso de quem usa: do início do primeiro dia ao início do dia seguinte
 * ao último. Período inválido devolve `null`.
 */
export function toReportQuery(range: DayRange): TimeReportQuery | null {
  if (rangeError(range)) return null;
  const from = parseDay(range.from) as Date;
  const to = parseDay(range.to) as Date;
  return { from: from.toISOString(), to: addDays(to, 1).toISOString() };
}
