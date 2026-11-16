import type { ReactNode } from 'react';
import { Card, SectionLabel, Skeleton } from '@/components/ui';
import { summarizeTasks } from '@/lib/tasks';
import { formatDay } from '@/lib/utils';
import { useTasks } from '../api/tasks.queries';

function SummaryCard({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <Card className="col-span-full sm:col-span-4 p-5">
      <SectionLabel className="mb-1">{label}</SectionLabel>
      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{children}</div>
    </Card>
  );
}

/** Usa a lista sem filtros, para os números não mudarem quando alguém filtra. */
export function TaskSummaryCards({ projectId }: { projectId: string }) {
  const { data: tasks } = useTasks(projectId);

  if (!tasks) return <Skeleton className="h-32 mb-8" />;

  const summary = summarizeTasks(tasks);

  return (
    <section aria-label="Resumo do projeto" className="grid grid-cols-12 gap-6 mb-8">
      <SummaryCard label="Progresso" value={`${summary.progress}%`}>
        {summary.done} de {summary.total} tarefas
        <div aria-hidden="true" className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${summary.progress}%` }} />
        </div>
      </SummaryCard>
      <SummaryCard label="Vencidas" value={summary.overdue}>
        Prazo passou e não foram concluídas
      </SummaryCard>
      <SummaryCard label="Vencem nesta semana" value={summary.dueThisWeek}>
        Até domingo, {formatDay(summary.weekEnd)}
      </SummaryCard>
    </section>
  );
}
