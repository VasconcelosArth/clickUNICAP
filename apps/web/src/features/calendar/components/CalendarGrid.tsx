/**
 * CalendarGrid — grade do calendário (mensal ou semanal).
 *
 * Renderiza:
 *   - Cabeçalho com os nomes dos dias da semana (rótulo de seção)
 *   - Células de cada dia, com número e lista de tarefas (chips)
 *
 * Segue as regras do guia de design (11-design-guia.md § Calendário):
 *   - Dentro de um Card, grade `grid grid-cols-7`
 *   - Nomes dos dias como rótulo de seção
 *   - Dia: `min-h-28 p-2 border-t border-l border-gray-100 dark:border-gray-700/60`
 *   - Dias de outro mês: `opacity-50`
 *   - Hoje: número em círculo `w-6 h-6 rounded-full bg-violet-700 text-white`
 */

import type { CalendarDay } from '../utils/calendar';
import { WEEK_DAY_LABELS } from '../utils/calendar';
import { CalendarTaskChip } from './CalendarTaskChip';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  days: CalendarDay[];
}

/**
 * Grade de dias do calendário.
 *
 * Recebe os dias já com as tarefas posicionadas (via `placeTasks`).
 * Não busca dados — é puramente de apresentação.
 */
export function CalendarGrid({ days }: CalendarGridProps) {
  return (
    // role="grid" + aria para acessibilidade do calendário (padrão ARIA)
    <div role="grid" aria-label="Grade do calendário">
      {/* Cabeçalho: nomes dos dias da semana */}
      <div
        role="row"
        className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700/60"
        aria-hidden="true" // decorativo — cada célula de dia já tem data legível
      >
        {WEEK_DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Células dos dias */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <CalendarDayCell key={day.iso} day={day} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Célula de um único dia
// ---------------------------------------------------------------------------

interface CalendarDayCellProps {
  day: CalendarDay;
}

function CalendarDayCell({ day }: CalendarDayCellProps) {
  // Número do dia no mês local (1–31)
  const dayNumber = day.date.getDate();

  return (
    <div
      role="gridcell"
      aria-label={day.iso}
      className={cn(
        'min-h-28 p-2 border-t border-l border-gray-100 dark:border-gray-700/60',
        // Dias de outro mês ficam apagados
        !day.isCurrentMonth && 'opacity-50',
      )}
    >
      {/* Número do dia */}
      <div className="mb-1 flex">
        {day.isToday ? (
          // Hoje: círculo violeta com o número
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-700 text-xs font-semibold text-white"
            aria-current="date"
          >
            {dayNumber}
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{dayNumber}</span>
        )}
      </div>

      {/* Lista de tarefas do dia */}
      {day.tasks.length > 0 && (
        <ul aria-label={`Tarefas do dia ${day.iso}`} className="space-y-0">
          {day.tasks.map((task) => (
            <li key={task.id}>
              <CalendarTaskChip task={task} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
