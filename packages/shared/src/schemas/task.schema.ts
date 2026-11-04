import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../enums';
import { dateOnlySchema, dateTimeSchema, idSchema } from './common.schema';

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(20000).nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assigneeId: idSchema.nullable(),
  startDate: dateOnlySchema.nullable(),
  dueDate: dateOnlySchema.nullable(),
  position: z.number(),
  createdBy: idSchema,
  completedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Task = z.infer<typeof taskSchema>;

/** Regra de domínio compartilhada: o início não pode ser depois do prazo. */
const startBeforeDue = (v: { startDate?: string | null; dueDate?: string | null }) =>
  !v.startDate || !v.dueDate || v.startDate <= v.dueDate;
const startBeforeDueMessage = { message: 'A data de início não pode ser depois do prazo', path: ['startDate'] };

const taskInputShape = z.object({
  title: z.string().trim().min(1, 'Informe o título').max(200),
  description: z.string().max(20000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: idSchema.nullable().optional(),
  startDate: dateOnlySchema.nullable().optional(),
  dueDate: dateOnlySchema.nullable().optional(),
});

export const createTaskSchema = taskInputShape.refine(startBeforeDue, startBeforeDueMessage);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = taskInputShape.partial().refine(startBeforeDue, startBeforeDueMessage);
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Mover tarefa no Kanban: novo status e entre quais tarefas ela ficou. */
export const moveTaskSchema = z.object({
  status: taskStatusSchema,
  beforeTaskId: idSchema.nullable(),
  afterTaskId: idSchema.nullable(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

/** Filtros da listagem (query string). Usados pela Lista, Minhas tarefas, Calendário. */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(',')).filter(Boolean))
    .pipe(z.array(item));

export const taskFiltersSchema = z.object({
  status: csv(taskStatusSchema).optional(),
  priority: csv(taskPrioritySchema).optional(),
  assigneeId: csv(idSchema).optional(),
  dueFrom: dateOnlySchema.optional(),
  dueTo: dateOnlySchema.optional(),
  search: z.string().trim().max(200).optional(),
});
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
