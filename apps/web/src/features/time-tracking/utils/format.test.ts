import { formatClock, formatMinutes } from './format';

describe('formatMinutes', () => {
  it('mostra só minutos abaixo de 1 hora', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('mostra horas e minutos, sem "0 min" em hora cheia', () => {
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(1441)).toBe('24 h 1 min');
  });
});

describe('formatClock', () => {
  it('formata horas, minutos e segundos com dois dígitos', () => {
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(59)).toBe('00:00:59');
    expect(formatClock(3725)).toBe('01:02:05');
  });

  it('ignora frações e valores negativos (relógio adiantado no servidor)', () => {
    expect(formatClock(61.9)).toBe('00:01:01');
    expect(formatClock(-5)).toBe('00:00:00');
  });
});
