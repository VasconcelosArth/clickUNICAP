import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { AppModule } from '@/app.module';
import { configureApp } from '@/main';
import { DRIZZLE, type Database } from '@/core/database/database.module';

/** Sobe a aplicação completa para testes e2e (mesma configuração do servidor real). */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

/** Apaga os dados de todas as tabelas (mantém a estrutura). Use no beforeEach. */
export async function resetDatabase(app: INestApplication) {
  const db = app.get<Database>(DRIZZLE);
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await db.execute(sql.raw(`truncate table ${list} restart identity cascade`));
}
