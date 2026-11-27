import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { todayIso } from '@/lib/utils';
import { readRange, rangeError, toReportQuery, type DayRange } from '../utils/period';

/** Período do relatório de horas, na URL (`?from=AAAA-MM-DD&to=AAAA-MM-DD`), para sobreviver ao F5 e ser compartilhado. */
export function useReportPeriod() {
  const [params, setParams] = useSearchParams();
  const fromParam = params.get('from');
  const toParam = params.get('to');

  const range = useMemo(() => readRange(fromParam, toParam, todayIso()), [fromParam, toParam]);
  const error = rangeError(range);
  const query = useMemo(() => toReportQuery(range), [range]);

  const setDay = useCallback(
    (name: keyof DayRange, value: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(name, value);
          else next.delete(name);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { range, error, query, setDay };
}
