import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id } from './_columns';
import { customFieldTypeEnum } from './enums';
import { projects } from './projects';
import { tasks } from './tasks';
import { users } from './users';

/** Dono: Pessoa 7 (módulo attachments). O arquivo fica no storage; aqui só os metadados. */
export const attachments = pgTable(
  'attachments',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index('attachments_task_id_idx').on(t.taskId), index('attachments_uploaded_by_idx').on(t.uploadedBy)],
);

/** Dono: Pessoa 8 (módulo custom-fields). `options` guarda as opções do tipo dropdown. */
export const customFields = pgTable(
  'custom_fields',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: customFieldTypeEnum('type').notNull(),
    options: jsonb('options').$type<string[]>(),
    isRequired: boolean('is_required').notNull().default(false),
    position: doublePrecision('position').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('custom_fields_project_id_idx').on(t.projectId)],
);

export const taskCustomFieldValues = pgTable(
  'task_custom_field_values',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => customFields.id, { onDelete: 'cascade' }),
    value: jsonb('value').$type<string | number | boolean | null>(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.fieldId] }), index('task_custom_field_values_field_id_idx').on(t.fieldId)],
);

/** Dono: Pessoa 9 (módulo dependencies). task_id fica bloqueada até depends_on_task_id ser concluída. */
export const taskDependencies = pgTable(
  'task_dependencies',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: uuid('depends_on_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }),
    index('task_dependencies_depends_on_idx').on(t.dependsOnTaskId),
    check('task_dependencies_no_self', sql`${t.taskId} <> ${t.dependsOnTaskId}`),
  ],
);

/** Dono: Pessoa 10 (módulo time-tracking). O índice único parcial garante 1 timer ativo por usuário. */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    minutes: integer('minutes'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('time_entries_task_id_idx').on(t.taskId),
    index('time_entries_user_id_idx').on(t.userId),
    uniqueIndex('time_entries_one_running_per_user').on(t.userId).where(sql`${t.endedAt} is null`),
    check('time_entries_minutes_positive', sql`${t.minutes} is null or ${t.minutes} >= 0`),
  ],
);
