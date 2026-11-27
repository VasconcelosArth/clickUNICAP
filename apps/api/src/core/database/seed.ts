/* eslint-disable no-console -- script de terminal */
import * as argon2 from 'argon2';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import * as schema from './schema';
import { buildSeedCustomFieldValues, buildSeedTasks, SEED_CUSTOM_FIELDS, SEED_PASSWORD, SEED_USERS } from './seed-data';

/** Dados de exemplo: pnpm --filter api db:seed. Pode rodar de novo: se já existirem, não faz nada. */
async function main() {
  config({ path: resolve(__dirname, '../../../../../.env') });
  if (process.env.NODE_ENV === 'production') throw new Error('O seed não roda em produção.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Rode: cp .env.example .env');

  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    const first = SEED_USERS[0]?.email ?? '';
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, first)).limit(1);
    if (existing) {
      console.log('Seed já aplicado. Nada a fazer.');
      return;
    }

    const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });
    await db.transaction(async (tx) => {
      const users = await tx
        .insert(schema.users)
        .values(SEED_USERS.map((u) => ({ ...u, passwordHash })))
        .returning();
      const owner = users[0];
      if (!owner) throw new Error('Falha ao criar usuários');

      const [ws] = await tx.insert(schema.workspaces).values({ name: 'UNICAP Demo', ownerId: owner.id }).returning();
      if (!ws) throw new Error('Falha ao criar workspace');
      await tx.insert(schema.workspaceMembers).values(
        users.map((u, i) => ({
          workspaceId: ws.id,
          userId: u.id,
          role: i === 0 ? ('admin' as const) : ('member' as const),
        })),
      );

      for (const name of ['App Mobile', 'Site institucional']) {
        const [project] = await tx
          .insert(schema.projects)
          .values({ workspaceId: ws.id, name, createdBy: owner.id })
          .returning();
        if (!project) throw new Error('Falha ao criar projeto');
        const tasks = await tx
          .insert(schema.tasks)
          .values(
            buildSeedTasks(name, 15).map(({ assigneeIndex, ...t }) => ({
              ...t,
              projectId: project.id,
              createdBy: owner.id,
              assigneeId: assigneeIndex === null ? null : (users[assigneeIndex]?.id ?? null),
              completedAt: t.status === 'done' ? new Date() : null,
            })),
          )
          .returning({ id: schema.tasks.id });

        // Campos personalizados (Pessoa 8): um de cada tipo, com valores nas tarefas para as colunas da Lista.
        const fields = await tx
          .insert(schema.customFields)
          .values(
            SEED_CUSTOM_FIELDS.map(({ name: fieldName, type, options, isRequired }, position) => ({
              projectId: project.id,
              name: fieldName,
              type,
              options,
              isRequired,
              position,
            })),
          )
          .returning({ id: schema.customFields.id, name: schema.customFields.name });
        const seedFields = fields.flatMap((field) => {
          const seed = SEED_CUSTOM_FIELDS.find((item) => item.name === field.name);
          return seed ? [{ id: field.id, seed }] : [];
        });
        const values = buildSeedCustomFieldValues(
          tasks.map((task) => task.id),
          seedFields,
        );
        if (values.length) await tx.insert(schema.taskCustomFieldValues).values(values);
      }
    });
    console.log(`Seed aplicado. Entre com ${first} e a senha ${SEED_PASSWORD}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
