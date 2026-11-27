/** Cores do gráfico de horas. Vêm dos tokens CSS do tema (docs/11-design-guia.md#gráficos), nunca do código. */
export interface ChartTheme {
  bar: string;
  text: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
}

/** `#rrggbb` com transparência, porque o canvas do Chart.js não lê classes do Tailwind. */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return color;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function chartTheme(dark: boolean, root: HTMLElement = document.documentElement): ChartTheme {
  const styles = getComputedStyle(root);
  const token = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();
  return {
    bar: token('violet-500'),
    text: token(dark ? 'gray-400' : 'gray-500'),
    grid: dark ? withAlpha(token('gray-700'), 0.6) : token('gray-100'),
    tooltipBackground: token(dark ? 'gray-700' : 'white'),
    tooltipBorder: token(dark ? 'gray-600' : 'gray-200'),
    tooltipText: token(dark ? 'gray-100' : 'gray-800'),
  };
}
