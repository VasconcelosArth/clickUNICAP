import { taskPrioritySchema, type TaskFilters, type TaskPriority } from '@clickunicap/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterName = 'search' | 'priority' | 'assigneeId';

function parsePriority(value: string | null): TaskPriority | null {
  const parsed = taskPrioritySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Os filtros ficam na URL, para serem compartilháveis e sobreviverem ao F5. */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const priority = parsePriority(params.get('priority'));
  const assigneeId = params.get('assigneeId') ?? '';

  const filters = useMemo<TaskFilters>(
    () => ({
      ...(search ? { search } : {}),
      ...(priority ? { priority: [priority] } : {}),
      ...(assigneeId ? { assigneeId: [assigneeId] } : {}),
    }),
    [search, priority, assigneeId],
  );

  const setFilter = useCallback(
    (name: FilterName, value: string) => {
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

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return {
    filters,
    search,
    priority: priority ?? '',
    assigneeId,
    hasFilters: Boolean(search || priority || assigneeId),
    setFilter,
    clearFilters,
  };
}
