import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import {
  ProjectTimeReportController,
  TaskTimeEntriesController,
  TimeEntriesController,
} from './time-tracking.controller';
import { TimeTrackingRepository } from './time-tracking.repository';
import { TimeTrackingService } from './time-tracking.service';

/** Dono: Pessoa 10. Controle de tempo: timer por tarefa (1 ativo por usuário), lançamentos manuais e relatório de horas. */
@Module({
  imports: [TasksModule, ProjectsModule],
  controllers: [TaskTimeEntriesController, TimeEntriesController, ProjectTimeReportController],
  providers: [TimeTrackingService, TimeTrackingRepository],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
