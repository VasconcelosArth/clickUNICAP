import { TASK_STATUS_LABELS, type Task, type TaskDependency, type TaskStatus } from '@clickunicap/shared';
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, SectionLabel } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import { isOverdue } from '@/lib/tasks';
import { cn, formatDay } from '@/lib/utils';
import { DAY_WIDTH, ROW_HEIGHT, buildTimeline, dependencyArrows, taskDates } from '../utils/timeline';

/** Cabeçalho da linha do tempo: uma faixa com os meses e outra com os dias. */
const HEADER_ROW = 24;
const HEADER_HEIGHT = HEADER_ROW * 2;

const barColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-400',
  in_progress: 'bg-sky-500',
  done: 'bg-green-500',
};

function periodText(task: Task): string {
  const dates = taskDates(task);
  if (!dates) return 'Sem datas';
  return dates.start === dates.end ? formatDay(dates.start) : `${formatDay(dates.start)} – ${formatDay(dates.end)}`;
}

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  today: string;
}

/**
 * Linha do tempo do projeto: à esquerda as tarefas (links acessíveis, com período e status em texto),
 * à direita as barras por status, a linha de hoje e as setas das dependências.
 */
export function GanttChart({ tasks, dependencies, today }: GanttChartProps) {
  const timeline = useMemo(() => buildTimeline(tasks, today), [tasks, today]);
  const arrows = useMemo(() => dependencyArrows(timeline.rows, dependencies), [timeline.rows, dependencies]);
  const conflicts = arrows.filter((arrow) => arrow.conflict);
  const taskLink = useTaskLink();
  const scrollRef = useRef<HTMLDivElement>(null);

  const width = timeline.days.length * DAY_WIDTH;
  const bodyHeight = timeline.rows.length * ROW_HEIGHT;
  const todayLeft = timeline.todayIndex === null ? null : timeline.todayIndex * DAY_WIDTH + DAY_WIDTH / 2;

  // Abre com hoje à vista, um pouco à esquerda do centro (efeito no DOM, não busca dados)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = todayLeft === null ? 0 : Math.max(0, todayLeft - el.clientWidth / 3);
  }, [todayLeft]);

  return (
    <Card className="overflow-hidden">
      {conflicts.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/60">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">
            {conflicts.length === 1
              ? '1 dependência com datas em conflito:'
              : `${conflicts.length} dependências com datas em conflito:`}
          </p>
          <ul className="text-sm mt-1 list-disc pl-5">
            {conflicts.map((arrow) => (
              <li key={arrow.key}>
                “{arrow.to.title}” começa antes de “{arrow.from.title}” terminar.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex">
        {/* Coluna das tarefas */}
        <div className="w-40 sm:w-64 shrink-0 border-r border-gray-200 dark:border-gray-700/60">
          <div
            className="flex items-end px-4 pb-1 border-b border-gray-100 dark:border-gray-700/60"
            style={{ height: HEADER_HEIGHT }}
          >
            <SectionLabel>Tarefa</SectionLabel>
          </div>
          <ul aria-label="Tarefas na linha do tempo">
            {timeline.rows.map(({ task }) => (
              <li
                key={task.id}
                className="flex flex-col justify-center px-4 border-b border-gray-100 dark:border-gray-700/60"
                style={{ height: ROW_HEIGHT }}
              >
                <Link
                  {...taskLink(task.id)}
                  className="truncate text-sm font-medium text-gray-800 dark:text-gray-100 hover:underline"
                >
                  {task.title}
                </Link>
                <span
                  className={cn(
                    'truncate text-xs font-medium',
                    isOverdue(task, today) ? 'text-red-800 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
                  )}
                >
                  {periodText(task)}
                  {isOverdue(task, today) && ' · Vencida'}
                  <span className="sr-only"> · {TASK_STATUS_LABELS[task.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Linha do tempo */}
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto" data-testid="gantt-timeline">
          <div className="relative" style={{ width }}>
            <div aria-hidden="true" className="border-b border-gray-100 dark:border-gray-700/60">
              <div className="flex" style={{ height: HEADER_ROW }}>
                {timeline.months.map((month) => (
                  <div
                    key={month.label}
                    className="shrink-0 truncate px-2 pt-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-l border-gray-100 dark:border-gray-700/60 first:border-l-0"
                    style={{ width: month.span * DAY_WIDTH }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: HEADER_ROW }}>
                {timeline.days.map((day, index) => (
                  <div
                    key={day.iso}
                    title={formatDay(day.iso)}
                    className={cn(
                      'shrink-0 text-center text-xs font-medium tabular-nums leading-6',
                      index === timeline.todayIndex
                        ? 'text-violet-700 dark:text-violet-400 font-semibold'
                        : 'text-gray-500 dark:text-gray-400',
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative" style={{ height: bodyHeight }}>
              {/* Grade: colunas dos dias (fim de semana destacado) e linhas das tarefas */}
              <div aria-hidden="true" className="absolute inset-0 flex">
                {timeline.days.map((day) => (
                  <div
                    key={day.iso}
                    className={cn(
                      'shrink-0 border-l border-gray-100 dark:border-gray-700/60 first:border-l-0',
                      day.weekend && 'bg-gray-50 dark:bg-gray-700/20',
                    )}
                    style={{ width: DAY_WIDTH }}
                  />
                ))}
              </div>
              <div aria-hidden="true" className="absolute inset-0">
                {timeline.rows.map(({ task }) => (
                  <div
                    key={task.id}
                    className="border-b border-gray-100 dark:border-gray-700/60"
                    style={{ height: ROW_HEIGHT }}
                  />
                ))}
              </div>

              {/* Hoje */}
              {todayLeft !== null && (
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-px bg-violet-500"
                  style={{ left: todayLeft }}
                />
              )}

              {/* Barras: a mesma informação está na coluna das tarefas, então ficam fora do Tab */}
              {timeline.rows.map(({ task, bar }, index) =>
                bar ? (
                  <Link
                    key={task.id}
                    {...taskLink(task.id)}
                    tabIndex={-1}
                    aria-hidden="true"
                    title={`${task.title} · ${periodText(task)} · ${TASK_STATUS_LABELS[task.status]}`}
                    data-testid={`gantt-bar-${task.id}`}
                    className={cn(
                      'absolute h-6 rounded-lg shadow-xs transition duration-150 hover:ring-2 hover:ring-violet-500/50',
                      barColors[task.status],
                    )}
                    style={{
                      left: bar.offset * DAY_WIDTH + 2,
                      width: bar.span * DAY_WIDTH - 4,
                      top: index * ROW_HEIGHT + (ROW_HEIGHT - 24) / 2,
                    }}
                  />
                ) : null,
              )}

              {/* Dependências */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none overflow-visible"
                width={width}
                height={bodyHeight}
              >
                <defs>
                  <marker
                    id="gantt-arrow"
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M0 0 L8 4 L0 8 z" className="fill-gray-400 dark:fill-gray-500" />
                  </marker>
                  <marker
                    id="gantt-arrow-conflict"
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M0 0 L8 4 L0 8 z" className="fill-red-500" />
                  </marker>
                </defs>
                {arrows.map((arrow) => (
                  <path
                    key={arrow.key}
                    d={arrow.path}
                    fill="none"
                    strokeWidth={1.5}
                    className={arrow.conflict ? 'stroke-red-500' : 'stroke-gray-400 dark:stroke-gray-500'}
                    markerEnd={arrow.conflict ? 'url(#gantt-arrow-conflict)' : 'url(#gantt-arrow)'}
                    data-testid={`gantt-arrow-${arrow.key}`}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
