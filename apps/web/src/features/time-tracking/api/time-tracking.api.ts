import type {
  CreateTimeEntryInput,
  CurrentTimer,
  StartTimerResult,
  TaskTimeEntries,
  TimeEntry,
} from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const timeTrackingApi = {
  listForTask: (taskId: string) => api.get<TaskTimeEntries>(`/tasks/${taskId}/time-entries`),
  current: () => api.get<CurrentTimer>('/time-entries/current'),
  start: (taskId: string) => api.post<StartTimerResult>(`/tasks/${taskId}/time-entries/start`),
  stop: () => api.post<TimeEntry>('/time-entries/current/stop'),
  create: (taskId: string, input: CreateTimeEntryInput) => api.post<TimeEntry>(`/tasks/${taskId}/time-entries`, input),
  remove: (entryId: string) => api.delete(`/time-entries/${entryId}`),
};
