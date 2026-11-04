import { parseDuration } from './duration';

describe('parseDuration', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['7d', 604_800_000],
    [' 1d ', 86_400_000],
  ])('%s → %i ms', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(['', '15', 'm', '1w', '-5m', '1.5h'])('rejeita "%s"', (input) => {
    expect(() => parseDuration(input)).toThrow(/Duração inválida/);
  });
});
