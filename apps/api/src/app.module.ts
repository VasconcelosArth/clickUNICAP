import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreAuthModule } from '@/core/auth/core-auth.module';
import { ConfigModule } from '@/core/config';
import { DatabaseModule } from '@/core/database/database.module';
import { AllExceptionsFilter } from '@/core/filters/all-exceptions.filter';
import { MailModule } from '@/core/mail/mail.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { DependenciesModule } from '@/modules/dependencies/dependencies.module';
import { CustomFieldsModule } from '@/modules/custom-fields/custom-fields.module';
import { HealthModule } from '@/modules/health/health.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { TimeTrackingModule } from '@/modules/time-tracking/time-tracking.module';
import { UsersModule } from '@/modules/users/users.module';
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';

/**
 * Módulo raiz. Cada módulo de negócio novo é registrado em `imports`.
 * Ordem: primeiro o core (infraestrutura), depois os módulos de negócio.
 */
@Module({
  imports: [
    // core
    ConfigModule,
    DatabaseModule,
    MailModule,
    CoreAuthModule,
    EventEmitterModule.forRoot(),
    // negócio
    HealthModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    DependenciesModule,
    CustomFieldsModule,
    NotificationsModule,
    TimeTrackingModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
