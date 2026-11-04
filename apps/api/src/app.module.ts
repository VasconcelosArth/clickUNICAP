import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@/core/config';
import { DatabaseModule } from '@/core/database/database.module';
import { AllExceptionsFilter } from '@/core/filters/all-exceptions.filter';
import { HealthModule } from '@/modules/health/health.module';

/**
 * Módulo raiz. Cada módulo de negócio novo é registrado em `imports`
 * (ex.: AuthModule, WorkspacesModule, TasksModule...).
 */
@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
