const UNITS_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/**
 * Converte durações do .env ("15m", "7d", "30s", "12h") em milissegundos.
 * @throws Error se o formato for inválido — falhar cedo é melhor que um token que nunca expira.
 */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Duração inválida: "${value}". Use números seguidos de s, m, h ou d (ex.: 15m, 7d).`);
  const [, amount, unit] = match;
  return Number(amount) * UNITS_MS[unit as keyof typeof UNITS_MS];
}
