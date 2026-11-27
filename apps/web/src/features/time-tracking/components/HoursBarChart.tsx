import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/ui.store';
import { chartTheme } from '../utils/chart-theme';
import { formatMinutes } from '../utils/format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export interface HoursBarItem {
  label: string;
  minutes: number;
}

/** Altura de cada barra com o espaço entre elas, e a do eixo de horas. */
const ROW_HEIGHT = 36;
const AXIS_HEIGHT = 32;

/**
 * Barras horizontais de horas, uma por item, do maior para o menor (a ordem vem da API). O canvas não é lido por
 * leitores de tela: os mesmos números estão na tabela ao lado, e o `aria-label` resume o gráfico.
 */
export function HoursBarChart({ items, label }: { items: HoursBarItem[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = chartTheme(theme === 'dark');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            data: items.map((item) => item.minutes / 60),
            backgroundColor: colors.bar,
            borderRadius: 4,
            maxBarThickness: 20,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : undefined,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBackground,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            cornerRadius: 8,
            padding: 8,
            caretSize: 0,
            displayColors: false,
            callbacks: { label: (context) => formatMinutes(items[context.dataIndex]?.minutes ?? 0) },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: colors.grid },
            ticks: { color: colors.text, callback: (value) => `${value} h` },
          },
          y: {
            border: { display: false },
            grid: { display: false },
            ticks: { color: colors.text },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [items, theme]);

  return (
    <div className="relative" style={{ height: items.length * ROW_HEIGHT + AXIS_HEIGHT }}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
