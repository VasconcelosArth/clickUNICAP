/** Minutos em texto curto. Ex.: 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Segundos no formato do cronômetro. Ex.: 3725 → "01:02:05". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
}
