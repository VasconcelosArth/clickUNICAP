import { describe, expect, it } from 'vitest';
import {
  MAX_TIME_ENTRY_MINUTES,
  createTimeEntrySchema,
  currentTimerSchema,
  taskTimeEntriesSchema,
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
});
