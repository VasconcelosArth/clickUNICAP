import type { TimeReport } from '@clickunicap/shared';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Card, CardHeader, EmptyState, ErrorState, FormField, Input, Skeleton } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import { useTimeReport } from '../api/time-tracking.queries';
import { HoursBarChart } from '../components/HoursBarChart';
import { useReportPeriod } from '../hooks/useReportPeriod';
import { formatMinutes } from '../utils/format';

const share = (minutes: number, total: number) => `${Math.round((minutes / total) * 100)}%`;

const headCell = 'p-2 font-semibold';
const tableClass = 'table-auto w-full dark:text-gray-300';
const theadClass = 'text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50';
const tbodyClass = 'text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60';

function ByMember({ report }: { report: TimeReport }) {
  const items = useMemo(
    () => report.byMember.map((member) => ({ label: member.userName, minutes: member.minutes })),
    [report.byMember],
  );
  const summary = items.map((item) => `${item.label}: ${formatMinutes(item.minutes)}`).join(', ');

  return (
    <Card className="col-span-full xl:col-span-6">
      <CardHeader title="Por membro" />
      <div className="px-5 pt-4">
        <HoursBarChart items={items} label={`Horas por membro. ${summary}`} />
      </div>
      <div className="p-3 overflow-x-auto">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={`${headCell} text-left`}>Membro</th>
              <th className={`${headCell} text-right w-32`}>Tempo</th>
              <th className={`${headCell} text-right w-24`}>Do total</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {report.byMember.map((member) => (
              <tr key={member.userId}>
                <td className="p-2 text-gray-800 dark:text-gray-100">{member.userName}</td>
                <td className="p-2 text-right tabular-nums">{formatMinutes(member.minutes)}</td>
                <td className="p-2 text-right tabular-nums">{share(member.minutes, report.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ByTask({ report }: { report: TimeReport }) {
  const taskLink = useTaskLink();

  return (
    <Card className="col-span-full xl:col-span-6">
      <CardHeader title="Por tarefa" />
      <div className="p-3 overflow-x-auto">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={`${headCell} text-left`}>Tarefa</th>
              <th className={`${headCell} text-right w-32`}>Tempo</th>
              <th className={`${headCell} text-right w-24`}>Do total</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {report.byTask.map((task) => (
              <tr key={task.taskId} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                <td className="p-2">
                  <Link
                    {...taskLink(task.taskId)}
                    className="text-gray-800 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
                  >
                    {task.taskTitle}
                  </Link>
                </td>
                <td className="p-2 text-right tabular-nums">{formatMinutes(task.minutes)}</td>
                <td className="p-2 text-right tabular-nums">{share(task.minutes, report.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório de horas" className="grid grid-cols-12 gap-6">
      <Skeleton className="col-span-full xl:col-span-6 h-64" />
      <Skeleton className="col-span-full xl:col-span-6 h-64" />
    </div>
  );
}

/** Relatório de horas do projeto: o tempo já parado no período, por membro e por tarefa. */
export function TimeReportPage() {
  const { projectId = '' } = useParams();
  const { range, error: rangeError, query, setDay } = useReportPeriod();
  const report = useTimeReport(projectId, query);

  let content;
  if (rangeError) {
    content = <Alert>{rangeError}</Alert>;
  } else if (report.isError) {
    content = <ErrorState message={report.error.message} onRetry={() => void report.refetch()} />;
  } else if (!report.data) {
    content = <ReportSkeleton />;
  } else if (report.data.totalMinutes === 0) {
    content = (
      <EmptyState
        title="Nenhum tempo lançado neste período"
        description="Use o timer ou lance tempo no detalhe de uma tarefa deste projeto."
      />
    );
  } else {
    content = (
      <div className="grid grid-cols-12 gap-6">
        <ByMember report={report.data} />
        <ByTask report={report.data} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <FormField label="De">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => setDay('from', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Até">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => setDay('to', event.target.value)}
            />
          )}
        </FormField>
        {report.data && !rangeError && (
          <p className="text-sm sm:ml-auto sm:pb-2" aria-live="polite">
            Total no período:{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {formatMinutes(report.data.totalMinutes)}
            </span>
          </p>
        )}
      </div>
      {content}
    </div>
  );
}
