import { check, date, doublePrecision, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { id, timestamps } from './_columns';
import { taskPriorityEnum, taskStatusEnum } from './enums';
import { projects } from './projects';
import { users } from './users';

/**
 * Dono: Pessoa 1 (módulo tasks). É a tabela central: Lista, Kanban, Calendário e Gantt leem daqui.
 * `position` = ordem fracionária dentro da coluna do Kanban (docs/06-banco-de-dados.md#ordenação-no-kanban-position).
 */
export const tasks = pgTable(
  'tasks',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('todo'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    startDate: date('start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    position: doublePrecision('position').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('tasks_project_status_position_idx').on(t.projectId, t.status, t.position),
    index('tasks_assignee_id_idx').on(t.assigneeId),
    index('tasks_due_date_idx').on(t.dueDate),
    index('tasks_created_by_idx').on(t.createdBy),
    check('tasks_start_before_due', sql`${t.startDate} is null or ${t.dueDate} is null or ${t.startDate} <= ${t.dueDate}`),
  ],
);
