import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { WorkspacesModule } from '@/modules/workspaces/workspaces.module';
import { ProjectTasksController, TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [ProjectsModule, WorkspacesModule],
  controllers: [ProjectTasksController, TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService],
})
export class TasksModule {}
