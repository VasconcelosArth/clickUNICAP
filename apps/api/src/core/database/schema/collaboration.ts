import { boolean, doublePrecision, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamps } from './_columns';
import { notificationTypeEnum } from './enums';
import { tasks } from './tasks';
import { users } from './users';
import { workspaces } from './workspaces';

/** Dono: Pessoa 4 (módulo subtasks). */
export const subtasks = pgTable(
  'subtasks',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    isDone: boolean('is_done').notNull().default(false),
    position: doublePrecision('position').notNull(),
    ...timestamps(),
  },
  (t) => [index('subtasks_task_id_idx').on(t.taskId)],
);

/** Dono: Pessoa 4 (módulo comments). */
export const comments = pgTable(
  'comments',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    ...timestamps(),
  },
  (t) => [index('comments_task_id_idx').on(t.taskId), index('comments_author_id_idx').on(t.authorId)],
);

/** Dono: Pessoa 4. Quem foi mencionado em cada comentário. */
export const commentMentions = pgTable(
  'comment_mentions',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] }), index('comment_mentions_user_id_idx').on(t.userId)],
);

/** Dono: Pessoa 5 (módulo notifications). */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    refId: uuid('ref_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('notifications_user_unread_idx').on(t.userId, t.readAt, t.createdAt.desc()),
    index('notifications_workspace_id_idx').on(t.workspaceId),
  ],
);
