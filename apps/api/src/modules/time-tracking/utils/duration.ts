const MINUTE_MS = 60_000;

/** Minutos inteiros entre duas datas, arredondando para baixo (59 s contam 0). Nunca negativo. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MINUTE_MS));
}

/** Data `minutes` minutos depois de `start`. */
export function addMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * MINUTE_MS);
}
