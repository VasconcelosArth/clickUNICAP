import { act, renderHook } from '@testing-library/react';
import { useElapsed } from './useElapsed';

describe('useElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T15:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('conta a partir do início e avança a cada segundo', () => {
    const { result } = renderHook(() => useElapsed('2026-11-24T14:59:00.000Z'));
    expect(result.current).toBe(60);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe(63);
  });

  it('sem início fica em 0 e não cria intervalo', () => {
    const { result } = renderHook(() => useElapsed(null));
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('para de contar ao perder o início', () => {
    const { result, rerender } = renderHook(({ startedAt }) => useElapsed(startedAt), {
      initialProps: { startedAt: '2026-11-24T14:59:00.000Z' as string | null },
    });
    rerender({ startedAt: null });

    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
