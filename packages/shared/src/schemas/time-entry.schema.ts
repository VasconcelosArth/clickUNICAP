import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.schema';

/** Um lançamento manual (ou a edição de um) pode ter no máximo 24 horas. */
export const MAX_TIME_ENTRY_MINUTES = 24 * 60;

const minutesSchema = z
  .number({ invalid_type_error: 'Informe os minutos' })
  .int('Use minutos inteiros')
  .min(1, 'Informe pelo menos 1 minuto')
  .max(MAX_TIME_ENTRY_MINUTES, 'Um lançamento pode ter no máximo 24 horas');

const noteSchema = z.string().trim().max(500, 'A nota pode ter no máximo 500 caracteres');

/**
 * Tempo gasto numa tarefa: vem do timer (iniciar e parar) ou de um lançamento manual.
 * Enquanto o timer conta, `endedAt` e `minutes` são `null`.
 */
export const timeEntrySchema = z.object({
  id: idSchema,
  taskId: idSchema,
  userId: idSchema,
  /** Nome de quem lançou, para a tela não precisar buscar os membros. */
  userName: z.string(),
  startedAt: dateTimeSchema,
  endedAt: dateTimeSchema.nullable(),
  minutes: z.number().int().nonnegative().nullable(),
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type TimeEntry = z.infer<typeof timeEntrySchema>;

/** Resposta de GET /api/tasks/:taskId/time-entries. `totalMinutes` soma só as entradas já paradas. */
export const taskTimeEntriesSchema = z.object({
  entries: z.array(timeEntrySchema),
  totalMinutes: z.number().int().nonnegative(),
});
export type TaskTimeEntries = z.infer<typeof taskTimeEntriesSchema>;

/** Timer ativo, com o título da tarefa para a tela avisar "rodando em <tarefa>". */
export const runningTimerSchema = timeEntrySchema.extend({ taskTitle: z.string() });
export type RunningTimer = z.infer<typeof runningTimerSchema>;

/** Resposta de GET /api/time-entries/current: o timer ativo do usuário neste workspace, ou `null`. */
export const currentTimerSchema = z.object({ timer: runningTimerSchema.nullable() });
export type CurrentTimer = z.infer<typeof currentTimerSchema>;

/**
 * Resposta de POST /api/tasks/:taskId/time-entries/start. Iniciar com um timer ativo em outra tarefa para o anterior:
 * `stopped` traz esse timer já parado, com os minutos, para a tela atualizar a outra tarefa.
 */
export const startTimerResultSchema = z.object({
  timer: timeEntrySchema,
  stopped: timeEntrySchema.nullable(),
});
export type StartTimerResult = z.infer<typeof startTimerResultSchema>;

/** Body de POST /api/tasks/:taskId/time-entries (lançamento manual). Sem `startedAt`, o tempo termina agora. */
export const createTimeEntrySchema = z.object({
  minutes: minutesSchema,
  startedAt: dateTimeSchema.optional(),
  note: noteSchema.optional(),
});
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

/** Body de PATCH /api/time-entries/:id. `note: null` apaga a nota. */
export const updateTimeEntrySchema = z
  .object({ minutes: minutesSchema, note: noteSchema.nullable() })
  .partial()
  .refine((v) => v.minutes !== undefined || v.note !== undefined, 'Informe os minutos ou a nota');
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

/** O relatório de horas cobre no máximo 1 ano por consulta. */
export const MAX_TIME_REPORT_DAYS = 366;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/**
 * Folga de 1 hora no limite: a tela manda dias inteiros no fuso de quem usa, e num fuso com horário de verão
 * 366 dias de calendário podem somar 1 hora a mais.
 */
const MAX_TIME_REPORT_MS = MAX_TIME_REPORT_DAYS * DAY_MS + HOUR_MS;

/**
 * Query de GET /api/projects/:projectId/time-report. Período `[from, to)` em ISO: a tela manda o início do primeiro dia
 * e o início do dia seguinte ao último, no fuso de quem usa. Entra o tempo que começou dentro do período.
 */
export const timeReportQuerySchema = z
  .object({
    from: dateTimeSchema,
    to: dateTimeSchema,
  })
  .refine((q) => Date.parse(q.to) > Date.parse(q.from), {
    message: 'O fim do período precisa ser depois do início',
    path: ['to'],
  })
  .refine((q) => Date.parse(q.to) - Date.parse(q.from) <= MAX_TIME_REPORT_MS, {
    message: `O período pode ter no máximo ${MAX_TIME_REPORT_DAYS} dias`,
    path: ['to'],
  });
export type TimeReportQuery = z.infer<typeof timeReportQuerySchema>;

const reportMinutesSchema = z.number().int().nonnegative();

/**
 * Resposta de GET /api/projects/:projectId/time-report: o tempo já parado do projeto no período, por membro e por
 * tarefa, cada lista do maior para o menor. Timers que ainda contam ficam de fora.
 */
export const timeReportSchema = z.object({
  from: dateTimeSchema,
  to: dateTimeSchema,
  totalMinutes: reportMinutesSchema,
  byMember: z.array(z.object({ userId: idSchema, userName: z.string(), minutes: reportMinutesSchema })),
  byTask: z.array(z.object({ taskId: idSchema, taskTitle: z.string(), minutes: reportMinutesSchema })),
});
export type TimeReport = z.infer<typeof timeReportSchema>;
