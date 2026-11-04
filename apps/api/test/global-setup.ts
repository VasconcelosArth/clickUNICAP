import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolve } from 'node:path';

/**
 * Roda UMA vez antes dos testes e2e: aponta a API para o banco de teste (porta 5433)
 * e aplica todas as migrations. Pré-requisito: docker compose up -d postgres-test
 */
export default async function globalSetup() {
  config({ path: resolve(__dirname, '../../../.env') });
  const url = process.env.DATABASE_URL_TEST ?? 'postgres://clickunicap:clickunicap@localhost:5433/clickunicap_test';
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(__dirname, '../src/core/database/migrations') });
  } catch (e) {
    throw new Error(
      `Não consegui preparar o banco de teste em ${url}.\n` +
        `Ele está rodando? -> docker compose up -d postgres-test\n${String(e)}`,
    );
  } finally {
    await pool.end();
  }
}
