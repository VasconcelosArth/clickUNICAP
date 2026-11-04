import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/core/database/schema/index.ts',
  out: './src/core/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://clickunicap:clickunicap@localhost:5432/clickunicap',
  },
  strict: true,
  verbose: true,
});
