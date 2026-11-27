import type { CreateTimeEntryInput, TimeReportQuery } from '@clickunicap/shared';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from './time-tracking.api';

export const timeKeys = {
  all: ['time-tracking'] as const,
  byTask: (taskId: string) => [...timeKeys.all, 'task', taskId] as const,
  current: () => [...timeKeys.all, 'current'] as const,
  report: (projectId: string, period: TimeReportQuery) =>
    [...timeKeys.all, 'report', projectId, period.from, period.to] as const,
};

export function useTaskTimeEntries(taskId: string) {
  return useQuery({ queryKey: timeKeys.byTask(taskId), queryFn: () => timeTrackingApi.listForTask(taskId) });
}

/** Timer ativo do usuário neste workspace (em qualquer tarefa). */
export function useCurrentTimer() {
  return useQuery({ queryKey: timeKeys.current(), queryFn: timeTrackingApi.current });
}

/** Relatório de horas do projeto no período. Sem período válido, não busca. */
export function useTimeReport(projectId: string, period: TimeReportQuery | null) {
  return useQuery({
    queryKey: timeKeys.report(projectId, period ?? { from: '', to: '' }),
    queryFn: period ? () => timeTrackingApi.report(projectId, period) : skipToken,
  });
}

/**
 * Iniciar pode pausar o timer de outra tarefa, e pausar muda o total da tarefa: toda escrita revalida o controle de
 * tempo inteiro (o timer ativo e as listas abertas).
 */
function useTimeMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timeKeys.all }),
  });
}

export const useStartTimer = () => useTimeMutation((taskId: string) => timeTrackingApi.start(taskId));

export const useStopTimer = () => useTimeMutation(() => timeTrackingApi.stop());

export const useCreateTimeEntry = () =>
  useTimeMutation(({ taskId, input }: { taskId: string; input: CreateTimeEntryInput }) =>
    timeTrackingApi.create(taskId, input),
  );

export const useDeleteTimeEntry = () => useTimeMutation((entryId: string) => timeTrackingApi.remove(entryId));
