import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, tasks, timeEntries, users, workspaces } from '@/core/database/schema';
import { createTestApp, resetDatabase } from './utils/create-test-app';

/** Confere, no Postgres de verdade, as regras que o banco garante (constraints e índices). */
describe('Regras do banco (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  async function seedTask() {
    const [user] = await db.insert(users).values({ name: 'Ana', email: 'Ana@Teste.com', passwordHash: 'x' }).returning();
    const [ws] = await db.insert(workspaces).values({ name: 'WS', ownerId: user!.id }).returning();
    const [project] = await db.insert(projects).values({ workspaceId: ws!.id, name: 'P', createdBy: user!.id }).returning();
    const [task] = await db
      .insert(tasks)
      .values({ projectId: project!.id, title: 'T', position: 1, createdBy: user!.id })
      .returning();
    return { user: user!, task: task! };
  }

  it('e-mail é único sem diferenciar maiúsculas (citext)', async () => {
    await seedTask();
    await expect(
      db.insert(users).values({ name: 'Outra', email: 'ana@teste.com', passwordHash: 'x' }),
    ).rejects.toThrow();
  });

  it('tarefa nova recebe status todo e prioridade medium', async () => {
    const { task } = await seedTask();
    expect(task).toMatchObject({ status: 'todo', priority: 'medium' });
  });

  it('rejeita data de início depois do prazo', async () => {
    const { task } = await seedTask();
    await expect(
      db.execute(sql`update tasks set start_date = '2026-12-02', due_date = '2026-12-01' where id = ${task.id}`),
    ).rejects.toThrow(/tasks_start_before_due/);
  });

  it('permite só 1 timer ativo por usuário', async () => {
    const { user, task } = await seedTask();
    await db.insert(timeEntries).values({ taskId: task.id, userId: user.id, startedAt: new Date() });
    await expect(
      db.insert(timeEntries).values({ taskId: task.id, userId: user.id, startedAt: new Date() }),
    ).rejects.toThrow();
  });
});
