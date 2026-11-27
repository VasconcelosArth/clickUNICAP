import type { TimeEntry } from '@clickunicap/shared';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  CloseIcon,
  ConfirmAction,
  ErrorState,
  SectionLabel,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useActiveWorkspaceId, useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { formatDay } from '@/lib/utils';
import {
  useCurrentTimer,
  useDeleteTimeEntry,
  useStartTimer,
  useStopTimer,
  useTaskTimeEntries,
} from '../api/time-tracking.queries';
import { useElapsed } from '../hooks/useElapsed';
import { formatClock, formatMinutes } from '../utils/format';
import { ManualEntryForm } from './ManualEntryForm';

const describeMinutes = (entry: TimeEntry) => (entry.minutes === null ? 'Contando' : formatMinutes(entry.minutes));

interface EntryListProps {
  entries: TimeEntry[];
  canDelete: (entry: TimeEntry) => boolean;
  deleting: boolean;
  onDelete: (entry: TimeEntry) => void;
}

function EntryList({ entries, canDelete, deleting, onDelete }: EntryListProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">Lançamentos</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum tempo lançado</p>
      ) : (
        <ul aria-label="Lançamentos" className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {describeMinutes(entry)}
                  <span className="font-normal text-gray-500 dark:text-gray-400"> · {entry.userName}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                  {formatDay(entry.startedAt)}
                  {entry.note && ` · ${entry.note}`}
                </p>
              </div>
              {canDelete(entry) && (
                <ConfirmAction
                  label={<CloseIcon />}
                  ariaLabel={`Excluir ${describeMinutes(entry)} de ${entry.userName}`}
                  question="Excluir este lançamento?"
                  confirmLabel="Excluir"
                  pending={deleting}
                  onConfirm={() => onDelete(entry)}
                  triggerProps={{ variant: 'ghost', size: 'xs' }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Slot da barra lateral do detalhe da tarefa: timer, total, lançamentos e lançamento manual. */
export function TimeTrackingPanel({ taskId }: TaskSlotProps) {
  const entries = useTaskTimeEntries(taskId);
  const current = useCurrentTimer();
  const start = useStartTimer();
  const stop = useStopTimer();
  const remove = useDeleteTimeEntry();
  const { data: me } = useCurrentUser();
  const { isAdmin } = useCurrentWorkspace();
  const workspaceId = useActiveWorkspaceId();
  // Mantém a tela de fundo: a outra tarefa abre no mesmo modal
  const { state } = useLocation();
  const [notice, setNotice] = useState<string | null>(null);

  const timer = current.data?.timer ?? null;
  const runningHere = timer?.taskId === taskId;
  const elapsed = useElapsed(runningHere ? timer.startedAt : null);

  if (entries.isPending || current.isPending) {
    return (
      <div role="status" aria-label="Carregando controle de tempo" className="space-y-2">
        <SectionLabel>Controle de tempo</SectionLabel>
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  }
  if (entries.isError || current.isError) {
    return (
      <div>
        <SectionLabel>Controle de tempo</SectionLabel>
        <ErrorState
          message={(entries.error ?? current.error)?.message ?? ''}
          onRetry={() => {
            void entries.refetch();
            void current.refetch();
          }}
        />
      </div>
    );
  }

  const elsewhere = timer && !runningHere ? timer : null;
  const mutationError = start.error ?? stop.error ?? remove.error;

  const beginAction = () => {
    setNotice(null);
    start.reset();
    stop.reset();
    remove.reset();
  };

  const startHere = () => {
    beginAction();
    const previousTitle = elsewhere?.taskTitle;
    start.mutate(taskId, {
      onSuccess: ({ stopped }) => {
        if (stopped && previousTitle) {
          setNotice(`O timer de "${previousTitle}" foi pausado com ${formatMinutes(stopped.minutes ?? 0)}.`);
        }
      },
    });
  };

  const pause = () => {
    beginAction();
    stop.mutate(undefined, {
      onSuccess: (entry) => setNotice(`Timer pausado: ${formatMinutes(entry.minutes ?? 0)} lançados.`),
    });
  };

  return (
    <div className="space-y-4">
      <SectionLabel>Controle de tempo</SectionLabel>
      {mutationError && <Alert>{mutationError.message}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            role="timer"
            aria-label="Cronômetro"
            className="text-sm font-medium tabular-nums text-gray-800 dark:text-gray-100"
          >
            {formatClock(elapsed)}
          </span>
          {runningHere && <StatusBadge status="in_progress" />}
        </div>
        {runningHere ? (
          <Button variant="secondary" size="sm" loading={stop.isPending} onClick={pause}>
            Pausar
          </Button>
        ) : (
          <Button variant="secondary" size="sm" loading={start.isPending} onClick={startHere}>
            Iniciar
          </Button>
        )}
      </div>
      {elsewhere && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Timer ativo em{' '}
          <Link
            to={routes.task(workspaceId, elsewhere.taskId)}
            state={state}
            replace
            className="font-medium text-gray-800 dark:text-gray-100 hover:underline"
          >
            {elsewhere.taskTitle}
          </Link>
          . Iniciar aqui pausa o outro.
        </p>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Total</span>
        <span className="font-medium text-gray-800 dark:text-gray-100">{formatMinutes(entries.data.totalMinutes)}</span>
      </div>

      <EntryList
        entries={entries.data.entries}
        // A API aceita excluir o timer que conta, mas a tela pede para pausar antes
        canDelete={(entry) => entry.endedAt !== null && (entry.userId === me?.id || isAdmin)}
        deleting={remove.isPending}
        onDelete={(entry) => {
          beginAction();
          remove.mutate(entry.id);
        }}
      />

      <ManualEntryForm taskId={taskId} />
    </div>
  );
}
