import { useEffect, useState } from 'react';

const secondsSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 1000;

/**
 * Segundos desde `startedAt`, atualizados a cada segundo enquanto houver um início. Só conta tempo na tela:
 * os minutos que valem são os que a API grava ao pausar.
 */
export function useElapsed(startedAt: string | null): number {
  const [seconds, setSeconds] = useState(() => (startedAt ? secondsSince(startedAt) : 0));

  useEffect(() => {
    if (!startedAt) {
      setSeconds(0);
      return;
    }
    setSeconds(secondsSince(startedAt));
    const timer = setInterval(() => setSeconds(secondsSince(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return seconds;
}
