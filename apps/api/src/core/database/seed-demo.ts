/* eslint-disable no-console -- script de terminal */
import * as argon2 from 'argon2';
import { config } from 'dotenv';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import * as schema from './schema';
import { SEED_PASSWORD } from './seed-data';
import { buildDemoTasks, DEMO_PEOPLE, DEMO_WORKSPACES, type DemoPerson } from './seed-demo-data';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MARKER_EMAIL = DEMO_PEOPLE.diego.email;
const FIRST_WORKSPACE_NAME = DEMO_WORKSPACES[0]?.name ?? '';

function localDayIso(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Dados fictícios: pnpm --filter api db:seed:demo [e-mail de uma conta existente].
 * Com e-mail, a conta recebe os workspaces no lugar da Ana. Só acrescenta; se já tiver rodado, não faz nada.
 */
async function main() {
  config({ path: resolve(__dirname, '../../../../../.env') });
  if (process.env.NODE_ENV === 'production') throw new Error('O seed não roda em produção.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Rode: cp .env.example .env');

  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    const accountEmail = process.argv[2];
    const [account] = accountEmail
      ? await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, accountEmail)).limit(1)
      : [];
    if (accountEmail && !account) {
      console.error('Conta não encontrada. Crie a conta pelo app e rode de novo.');
      process.exitCode = 1;
      return;
    }

    const [existing] = account
      ? await db
          .select({ id: schema.workspaces.id })
          .from(schema.workspaces)
          .where(and(eq(schema.workspaces.ownerId, account.id), eq(schema.workspaces.name, FIRST_WORKSPACE_NAME)))
          .limit(1)
      : await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, MARKER_EMAIL))
          .limit(1);
    if (existing) {
      console.log('Dados de demonstração já aplicados. Nada a fazer.');
      return;
    }

    const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });
    const today = localDayIso(new Date());
    const people = Object.values(DEMO_PEOPLE);

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.users)
        .values(people.map((person) => ({ ...person, passwordHash })))
        .onConflictDoNothing({ target: schema.users.email });

      const rows = await tx
        .select({ id: schema.users.id, email: schema.users.email })
        .from(schema.users)
        .where(
          inArray(
            schema.users.email,
            people.map((person) => person.email),
          ),
        );
      const idOf = (person: DemoPerson): string => {
        if (person === 'ana' && account) return account.id;
        const row = rows.find((candidate) => candidate.email === DEMO_PEOPLE[person].email);
        if (!row) throw new Error(`Usuário não encontrado: ${person}`);
        return row.id;
      };

      for (const demo of DEMO_WORKSPACES) {
        const ownerId = idOf(demo.owner);
        const [workspace] = await tx.insert(schema.workspaces).values({ name: demo.name, ownerId }).returning();
        if (!workspace) throw new Error('Falha ao criar workspace');

        await tx.insert(schema.workspaceMembers).values(
          Object.entries(demo.members).map(([person, role]) => ({
            workspaceId: workspace.id,
            userId: idOf(person as DemoPerson),
            role,
          })),
        );

        if (demo.invites.length > 0) {
          await tx.insert(schema.workspaceInvites).values(
            demo.invites.map((invite) => ({
              ...invite,
              workspaceId: workspace.id,
              invitedBy: ownerId,
              // Valor aleatório que não corresponde a nenhum link: o convite só aparece na lista
              tokenHash: randomBytes(32).toString('hex'),
              expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            })),
          );
        }

        for (const demoProject of demo.projects) {
          const [project] = await tx
            .insert(schema.projects)
            .values({
              workspaceId: workspace.id,
              name: demoProject.name,
              description: demoProject.description,
              color: demoProject.color,
              archivedAt: demoProject.archived ? new Date() : null,
              createdBy: ownerId,
            })
            .returning();
          if (!project) throw new Error('Falha ao criar projeto');

          await tx.insert(schema.tasks).values(
            buildDemoTasks(demoProject.tasks, today).map(({ assignee, ...task }) => ({
              ...task,
              projectId: project.id,
              createdBy: ownerId,
              assigneeId: assignee ? idOf(assignee) : null,
            })),
          );
        }
      }
    });

    console.log(
      account
        ? 'Dados de demonstração aplicados na conta informada.'
        : `Dados de demonstração aplicados. Entre com ${DEMO_PEOPLE.ana.email} e a senha do seed.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
