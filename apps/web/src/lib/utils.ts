import { clsx, type ClassValue } from 'clsx';
import { endOfWeek, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Data de hoje no fuso de quem usa, no formato da API (AAAA-MM-DD). */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function endOfWeekIso(dayIso: string): string {
  return format(endOfWeek(parseISO(dayIso), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/** Ex.: "13 nov". */
export function formatDay(iso: string): string {
  return format(parseISO(iso), 'd MMM', { locale: ptBR });
}

/** Ex.: "4 nov 2026". */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: ptBR });
}

/** Ex.: "Ana Souza" vira "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}
