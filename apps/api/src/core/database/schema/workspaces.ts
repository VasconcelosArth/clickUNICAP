import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext, createdAt, id, timestamps } from './_columns';
import { memberRoleEnum } from './enums';
import { users } from './users';

/** Dono: Pessoa 1 (módulo workspaces). Todo dado de negócio pertence a um workspace. */
export const workspaces = pgTable(
  'workspaces',
  {
    id: id(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (t) => [index('workspaces_owner_id_idx').on(t.ownerId)],
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index('workspace_members_user_id_idx').on(t.userId)],
);

export const workspaceInvites = pgTable(
  'workspace_invites',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: citext('email').notNull(),
    role: memberRoleEnum('role').notNull().default('member'),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('workspace_invites_workspace_id_idx').on(t.workspaceId),
    index('workspace_invites_email_idx').on(t.email),
    index('workspace_invites_invited_by_idx').on(t.invitedBy),
  ],
);
