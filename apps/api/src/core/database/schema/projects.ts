import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';
import { users } from './users';
import { workspaces } from './workspaces';

/** Dono: Pessoa 1 (módulo projects). Projetos são arquivados (archived_at), não apagados. */
export const projects = pgTable(
  'projects',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (t) => [index('projects_workspace_id_idx').on(t.workspaceId), index('projects_created_by_idx').on(t.createdBy)],
);
