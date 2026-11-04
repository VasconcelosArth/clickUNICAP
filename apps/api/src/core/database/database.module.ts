import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '@/core/config';
import * as schema from './schema';

/** Token de injeção do Drizzle: @Inject(DRIZZLE) private readonly db: Database */
export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Pool({ connectionString: config.databaseUrl, max: 10 }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Fecha as conexões ao desligar a API (e ao fim dos testes e2e). */
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
