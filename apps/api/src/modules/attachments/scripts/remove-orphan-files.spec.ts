import { parseOlderThanMinutes } from './remove-orphan-files';

describe('parseOlderThanMinutes', () => {
  it('defaults to 60 minutes', () => {
    expect(parseOlderThanMinutes([])).toBe(60);
  });

  it('reads --older-than', () => {
    expect(parseOlderThanMinutes(['--older-than=5'])).toBe(5);
  });

  it('rejects a value that is not a positive integer', () => {
    expect(() => parseOlderThanMinutes(['--older-than=0'])).toThrow();
    expect(() => parseOlderThanMinutes(['--older-than=abc'])).toThrow();
    expect(() => parseOlderThanMinutes(['--older-than=1.5'])).toThrow();
  });
});
