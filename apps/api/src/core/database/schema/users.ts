import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { citext, createdAt, id, timestamps } from './_columns';

/** Dono: Pessoa 1 (módulos auth e users). */
export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  ...timestamps(),
});

/** Refresh tokens guardados como hash; revogados no logout. */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId)],
);

/** Tokens de "esqueci minha senha", de uso único. */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('password_reset_tokens_user_id_idx').on(t.userId)],
);
