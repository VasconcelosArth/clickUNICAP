/**
 * CalendarHeader — cabeçalho de navegação do calendário.
 *
 * Exibe:
 *   - Botão "Hoje" para voltar ao período atual
 *   - Setas de mês/semana anterior e seguinte (IconButton)
 *   - Rótulo do período atual (mês/semana)
 *   - Alternância entre as visões Mês e Semana (botões `secondary`)
 *
 * Segue o guia de design (11-design-guia.md § Calendário):
 *   "Mês anterior e seguinte com IconButton; alternância mês/semana com botões `secondary`."
 */

import { Button, IconButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { CalendarView } from '../utils/calendar';
import { formatMonthYear, formatWeekRange, goToToday, navigate } from '../utils/calendar';

// Ícones SVG em linha (16×16, fill-current, conforme guia de design § Ícones)
function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props e componente
// ---------------------------------------------------------------------------

interface CalendarHeaderProps {
  /** Data de referência do período exibido. */
  reference: Date;
  /** Visão atual (mês ou semana). */
  view: CalendarView;
  /** Callback chamado ao mudar a data de referência. */
  onReferenceChange: (date: Date) => void;
  /** Callback chamado ao alternar a visão. */
  onViewChange: (view: CalendarView) => void;
}

/**
 * Cabeçalho de navegação do calendário.
 *
 * Totalmente controlado: recebe `reference` e `view` como props e chama
 * os callbacks sem gerenciar estado interno.
 */
export function CalendarHeader({ reference, view, onReferenceChange, onViewChange }: CalendarHeaderProps) {
  // Rótulo do período exibido
  const periodLabel = view === 'month' ? formatMonthYear(reference) : formatWeekRange(reference);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
      {/* Lado esquerdo: Hoje + setas + rótulo */}
      <div className="flex items-center gap-2">
        {/* Botão Hoje */}
        <Button variant="secondary" size="sm" onClick={() => onReferenceChange(goToToday())}>
          Hoje
        </Button>

        {/* Seta: período anterior */}
        <IconButton
          aria-label={view === 'month' ? 'Mês anterior' : 'Semana anterior'}
          onClick={() => onReferenceChange(navigate(reference, 'prev', view))}
        >
          <ChevronLeftIcon />
        </IconButton>

        {/* Seta: próximo período */}
        <IconButton
          aria-label={view === 'month' ? 'Próximo mês' : 'Próxima semana'}
          onClick={() => onReferenceChange(navigate(reference, 'next', view))}
        >
          <ChevronRightIcon />
        </IconButton>

        {/* Rótulo do período atual */}
        <h2 className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-100">{periodLabel}</h2>
      </div>

      {/* Lado direito: alternância Mês / Semana */}
      <div role="group" aria-label="Alternância de visão" className="flex items-center gap-1">
        {(['month', 'week'] as const).map((v) => (
          <Button
            key={v}
            variant="secondary"
            size="sm"
            onClick={() => onViewChange(v)}
            aria-pressed={view === v}
            className={cn(view === v && 'ring-2 ring-violet-500/50 ring-inset')}
          >
            {v === 'month' ? 'Mês' : 'Semana'}
          </Button>
        ))}
      </div>
    </div>
  );
}
