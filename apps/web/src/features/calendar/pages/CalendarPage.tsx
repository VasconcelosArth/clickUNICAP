/**
 * CalendarPage — visão Calendário do projeto.
 *
 * Rota: /w/:workspaceId/p/:projectId/calendar
 * Dono: Pessoa 6
 *
 * Esta página busca as tarefas do projeto (reutilizando `useTasks` de
 * @/features/tasks, igual ao Kanban e à Lista) e as distribui nos dias de
 * uma grade mensal ou semanal.
 *
 * Funcionalidades:
 *   - Alternância entre visão Mês e Semana via URL (?view=month|week)
 *   - Navegação entre períodos (anterior / próximo / hoje)
 *   - Tarefas posicionadas pelo prazo (dueDate); as sem prazo não aparecem
 *   - Chips de tarefa clicáveis que abrem o modal de detalhe
 *   - Estados de loading, vazio e erro padronizados (guia de design § Estados)
 */

import { useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingList } from '@/components/ui';
import { useTasks } from '@/features/tasks';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { buildCalendarGrid, placeTasks, type CalendarView } from '../utils/calendar';
import { CalendarGrid } from '../components/CalendarGrid';
import { CalendarHeader } from '../components/CalendarHeader';

// ---------------------------------------------------------------------------
// Helpers de URL
// ---------------------------------------------------------------------------

/** Lê e escreve a data de referência na URL como ?ref=AAAA-MM-DD. */
function useCalendarRef(): [Date, (d: Date) => void] {
  const [params, setParams] = useSearchParams();
  const rawRef = params.get('ref');
  // Parseia a data de referência da URL; se inválida ou ausente, usa hoje
  const reference = useMemo(() => {
    if (!rawRef) return new Date();
    const parsed = new Date(`${rawRef}T12:00:00`);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [rawRef]);

  const setReference = useCallback(
    (date: Date) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          // Guarda apenas AAAA-MM-DD (sem hora)
          next.set('ref', date.toISOString().slice(0, 10));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [reference, setReference];
}

/** Lê e escreve a visão do calendário na URL como ?view=month|week. */
function useCalendarView(): [CalendarView, (v: CalendarView) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: CalendarView = raw === 'week' ? 'week' : 'month';

  const setView = useCallback(
    (v: CalendarView) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('view', v);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [view, setView];
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Página do Calendário.
 *
 * Integração com o ProjectLayout: o cabeçalho do projeto (título, resumo,
 * abas e filtros) é renderizado pelo layout pai; esta página renderiza apenas
 * o corpo do calendário dentro do `<Outlet />`.
 */
export function CalendarPage() {
  const { projectId = '' } = useParams();
  const { filters, hasFilters } = useTaskFilters();

  // Busca as tarefas do projeto (mesmas chaves do Kanban/Lista)
  const { data: tasks, isPending, error, refetch } = useTasks(projectId, filters);

  // Estado de navegação e visão persistido na URL
  const [reference, setReference] = useCalendarRef();
  const [view, setView] = useCalendarView();

  // Monta a grade e posiciona as tarefas (recalcula apenas quando necessário)
  const days = useMemo(() => {
    const grid = buildCalendarGrid(reference, view);
    return tasks ? placeTasks(grid, tasks) : grid;
  }, [reference, view, tasks]);

  // ----- Estados de loading e erro -----

  if (isPending) return <LoadingList />;

  if (error) {
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  // ----- Estado vazio -----
  // Conta apenas tarefas com prazo no período atual
  const tasksWithDue = tasks.filter((t) => t.dueDate !== null);
  const isEmpty = tasksWithDue.length === 0;

  return (
    <Card>
      {/* Cabeçalho com navegação e alternância de visão */}
      <CalendarHeader reference={reference} view={view} onReferenceChange={setReference} onViewChange={setView} />

      {/* Corpo: grade ou estado vazio */}
      {isEmpty && !hasFilters ? (
        <EmptyState
          title="Nenhuma tarefa com prazo neste projeto"
          description="Defina um prazo no detalhe da tarefa para que ela apareça no calendário."
        />
      ) : isEmpty && hasFilters ? (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Nenhuma tarefa com prazo corresponde aos filtros ativos."
        />
      ) : (
        <CalendarGrid days={days} />
      )}
    </Card>
  );
}
