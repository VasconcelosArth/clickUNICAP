import { Controller, Get, HttpCode, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';

/** GET /api/health — usado por quem sobe o ambiente e por monitoramento. */
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  @HttpCode(200)
  async check() {
    const database = await this.db
      .execute(sql`select 1`)
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    return { status: database === 'up' ? 'ok' : 'degraded', database };
  }
}
