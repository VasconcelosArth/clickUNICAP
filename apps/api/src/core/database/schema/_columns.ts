import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Colunas reutilizadas por todas as tabelas. Use sempre estes helpers para manter o padrão
 * descrito em docs/06-banco-de-dados.md#convenções.
 */

/** Chave primária UUID gerada pelo banco. */
export const id = () => uuid('id').primaryKey().defaultRandom();

/** created_at + updated_at (atualizado automaticamente pelo Drizzle a cada UPDATE). */
export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Só created_at, para registros que não são editados (notificações, anexos). */
export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** Texto sem diferenciar maiúsculas/minúsculas (extensão citext). Usado em e-mails. */
export const citext = customType<{ data: string }>({ dataType: () => 'citext' });
