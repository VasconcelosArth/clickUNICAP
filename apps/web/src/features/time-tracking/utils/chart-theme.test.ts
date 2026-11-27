import { chartTheme, withAlpha } from './chart-theme';

describe('withAlpha', () => {
  it('converte #rrggbb em rgba', () => {
    expect(withAlpha('#374151', 0.6)).toBe('rgba(55, 65, 81, 0.6)');
  });

  it('devolve a cor como veio quando não é #rrggbb', () => {
    expect(withAlpha('', 0.6)).toBe('');
    expect(withAlpha('oklch(0.5 0.1 200)', 0.6)).toBe('oklch(0.5 0.1 200)');
  });
});

describe('chartTheme', () => {
  const root = document.createElement('div');
  const tokens = {
    'violet-500': '#8470ff',
    'gray-100': '#f3f4f6',
    'gray-200': '#e5e7eb',
    'gray-400': '#9ca3af',
    'gray-500': '#6b7280',
    'gray-600': '#4b5563',
    'gray-700': '#374151',
    'gray-800': '#1f2937',
    white: '#fff',
  };
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(`--color-${name}`, value));

  it('usa os tokens do tema claro', () => {
    expect(chartTheme(false, root)).toEqual({
      bar: '#8470ff',
      text: '#6b7280',
      grid: '#f3f4f6',
      tooltipBackground: '#fff',
      tooltipBorder: '#e5e7eb',
      tooltipText: '#1f2937',
    });
  });

  it('usa os tokens do tema escuro, com a grade a 60%', () => {
    expect(chartTheme(true, root)).toMatchObject({
      text: '#9ca3af',
      grid: 'rgba(55, 65, 81, 0.6)',
      tooltipBackground: '#374151',
      tooltipBorder: '#4b5563',
    });
  });
});
