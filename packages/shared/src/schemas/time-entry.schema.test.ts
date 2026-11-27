import { describe, expect, it } from 'vitest';
import {
  MAX_TIME_ENTRY_MINUTES,
  MAX_TIME_REPORT_DAYS,
  createTimeEntrySchema,
  currentTimerSchema,
  startTimerResultSchema,
  taskTimeEntriesSchema,
  timeReportQuerySchema,
  timeReportSchema,
  updateTimeEntrySchema,
} from './time-entry.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
const entry = {
  id: uuid,
  taskId: uuid,
  userId: uuid,
  userName: 'Ana',
  startedAt: '2026-11-24T12:00:00.000Z',
  endedAt: '2026-11-24T12:30:00.000Z',
  minutes: 30,
  note: null,
  createdAt: '2026-11-24T12:30:00.000Z',
};

describe('createTimeEntrySchema', () => {
  it('aceita minutos, com início e nota opcionais', () => {
    expect(createTimeEntrySchema.parse({ minutes: 45 })).toEqual({ minutes: 45 });
    expect(
      createTimeEntrySchema.parse({ minutes: 45, startedAt: '2026-11-24T09:00:00.000Z', note: '  revisão  ' }),
    ).toEqual({ minutes: 45, startedAt: '2026-11-24T09:00:00.000Z', note: 'revisão' });
  });

  it('recusa minutos zerados, negativos, quebrados ou acima de 24 horas', () => {
    for (const minutes of [0, -5, 1.5, MAX_TIME_ENTRY_MINUTES + 1]) {
      expect(createTimeEntrySchema.safeParse({ minutes }).success).toBe(false);
    }
    expect(createTimeEntrySchema.safeParse({ minutes: MAX_TIME_ENTRY_MINUTES }).success).toBe(true);
  });

  it('recusa body sem minutos, início fora do ISO e nota longa', () => {
    expect(createTimeEntrySchema.safeParse({}).success).toBe(false);
    expect(createTimeEntrySchema.safeParse({ minutes: 10, startedAt: '24/11/2026' }).success).toBe(false);
    expect(createTimeEntrySchema.safeParse({ minutes: 10, note: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('updateTimeEntrySchema', () => {
  it('aceita só os minutos, só a nota ou nota nula', () => {
    expect(updateTimeEntrySchema.parse({ minutes: 20 })).toEqual({ minutes: 20 });
    expect(updateTimeEntrySchema.parse({ note: 'ajuste' })).toEqual({ note: 'ajuste' });
    expect(updateTimeEntrySchema.parse({ note: null })).toEqual({ note: null });
  });

  it('recusa body vazio e minutos inválidos', () => {
    expect(updateTimeEntrySchema.safeParse({}).success).toBe(false);
    expect(updateTimeEntrySchema.safeParse({ minutes: 0 }).success).toBe(false);
  });
});

describe('respostas', () => {
  it('lista com total e timer ativo (ou nulo)', () => {
    expect(taskTimeEntriesSchema.parse({ entries: [entry], totalMinutes: 30 }).totalMinutes).toBe(30);
    const running = { ...entry, endedAt: null, minutes: null, taskTitle: 'Montar a vitrine' };
    expect(currentTimerSchema.parse({ timer: running }).timer?.taskTitle).toBe('Montar a vitrine');
    expect(currentTimerSchema.parse({ timer: null })).toEqual({ timer: null });
  });

  it('início do timer, com ou sem o timer anterior parado', () => {
    const timer = { ...entry, endedAt: null, minutes: null };
    expect(startTimerResultSchema.parse({ timer, stopped: entry }).stopped?.minutes).toBe(30);
    expect(startTimerResultSchema.parse({ timer, stopped: null }).stopped).toBeNull();
    expect(startTimerResultSchema.safeParse({ timer }).success).toBe(false);
  });
});

describe('timeReportQuerySchema', () => {
  const from = '2026-11-01T03:00:00.000Z';

  it('aceita um período em ISO com o fim depois do início', () => {
    expect(timeReportQuerySchema.parse({ from, to: '2026-12-01T03:00:00.000Z' })).toEqual({
      from,
      to: '2026-12-01T03:00:00.000Z',
    });
  });

  it('recusa período vazio, invertido ou sem datas', () => {
    expect(timeReportQuerySchema.safeParse({ from, to: from }).success).toBe(false);
    expect(timeReportQuerySchema.safeParse({ from, to: '2026-10-01T03:00:00.000Z' }).success).toBe(false);
    expect(timeReportQuerySchema.safeParse({ from: '2026-11-01', to: '2026-11-30' }).success).toBe(false);
    expect(timeReportQuerySchema.safeParse({}).success).toBe(false);
  });

  it(`aceita até ${MAX_TIME_REPORT_DAYS} dias`, () => {
    const day = 24 * 60 * 60 * 1000;
    const end = (days: number) => new Date(Date.parse(from) + days * day).toISOString();
    expect(timeReportQuerySchema.safeParse({ from, to: end(MAX_TIME_REPORT_DAYS) }).success).toBe(true);
    // Horário de verão: 366 dias de calendário podem ter 1 hora a mais
    const withDst = new Date(Date.parse(end(MAX_TIME_REPORT_DAYS)) + 60 * 60 * 1000).toISOString();
    expect(timeReportQuerySchema.safeParse({ from, to: withDst }).success).toBe(true);
    const tooLong = timeReportQuerySchema.safeParse({ from, to: end(MAX_TIME_REPORT_DAYS + 1) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe('O período pode ter no máximo 366 dias');
  });
});

describe('timeReportSchema', () => {
  it('aceita o relatório por membro e por tarefa', () => {
    const report = {
      from: '2026-11-01T03:00:00.000Z',
      to: '2026-12-01T03:00:00.000Z',
      totalMinutes: 90,
      byMember: [{ userId: uuid, userName: 'Ana', minutes: 90 }],
      byTask: [{ taskId: uuid, taskTitle: 'Montar a vitrine', minutes: 90 }],
    };
    expect(timeReportSchema.parse(report)).toEqual(report);
    expect(timeReportSchema.safeParse({ ...report, totalMinutes: -1 }).success).toBe(false);
  });
});
