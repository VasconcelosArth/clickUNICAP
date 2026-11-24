import { addMinutes, minutesBetween } from './duration';

describe('minutesBetween', () => {
  const start = new Date('2026-11-24T12:00:00.000Z');

  it('conta os minutos exatos', () => {
    expect(minutesBetween(start, new Date('2026-11-24T13:30:00.000Z'))).toBe(90);
  });

  it('arredonda os segundos para baixo', () => {
    expect(minutesBetween(start, new Date('2026-11-24T12:00:59.999Z'))).toBe(0);
    expect(minutesBetween(start, new Date('2026-11-24T12:02:30.000Z'))).toBe(2);
  });

  it('intervalo zero ou invertido dá 0', () => {
    expect(minutesBetween(start, start)).toBe(0);
    expect(minutesBetween(start, new Date('2026-11-24T11:00:00.000Z'))).toBe(0);
  });
});

describe('addMinutes', () => {
  it('soma os minutos à data', () => {
    expect(addMinutes(new Date('2026-11-24T23:30:00.000Z'), 45).toISOString()).toBe('2026-11-25T00:15:00.000Z');
  });
});
