import type { CreateTimeEntryInput, CurrentTimer, TaskTimeEntries, TimeEntry, TimeReport } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { ids, user } from '@/mocks/fixtures';

const NOW = '2026-11-24T15:00:00.000Z';

/** Entrada de tempo de exemplo, da Ana na tarefa padrão das fixtures. */
export function timeEntry(over: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    taskId: ids.task,
    userId: ids.user,
    userName: user.name,
    startedAt: '2026-11-24T14:00:00.000Z',
    endedAt: '2026-11-24T14:30:00.000Z',
    minutes: 30,
    note: null,
    createdAt: '2026-11-24T14:30:00.000Z',
    ...over,
  };
}

const empty: TaskTimeEntries = { entries: [], totalMinutes: 0 };
const noTimer: CurrentTimer = { timer: null };

/** Respostas padrão: nenhum tempo lançado e nenhum timer ativo. Os testes trocam com `server.use`. */
export const timeTrackingHandlers = [
  http.get('*/tasks/:taskId/time-entries', () => HttpResponse.json(empty)),
  http.get('*/time-entries/current', () => HttpResponse.json(noTimer)),
  http.post('*/tasks/:taskId/time-entries/start', ({ params }) =>
    HttpResponse.json(
      {
        timer: timeEntry({ taskId: String(params.taskId), startedAt: NOW, endedAt: null, minutes: null }),
        stopped: null,
      },
      { status: 201 },
    ),
  ),
  http.post('*/time-entries/current/stop', () => HttpResponse.json(timeEntry({ minutes: 0 }))),
  http.post('*/tasks/:taskId/time-entries', async ({ params, request }) => {
    const input = (await request.json()) as CreateTimeEntryInput;
    return HttpResponse.json(
      timeEntry({ taskId: String(params.taskId), minutes: input.minutes, note: input.note ?? null }),
      { status: 201 },
    );
  }),
  http.delete('*/time-entries/:id', () => new HttpResponse(null, { status: 204 })),
  http.get('*/projects/:projectId/time-report', ({ request }) => {
    const url = new URL(request.url);
    const report: TimeReport = {
      from: url.searchParams.get('from') ?? NOW,
      to: url.searchParams.get('to') ?? NOW,
      totalMinutes: 0,
      byMember: [],
      byTask: [],
    };
    return HttpResponse.json(report);
  }),
];
