import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { ProjectDependenciesController, TaskDependenciesController } from './dependencies.controller';
import { DependenciesRepository } from './dependencies.repository';
import { DependenciesService } from './dependencies.service';

/** Dono: Pessoa 9. Dependências entre tarefas ("bloqueada por" / "bloqueia"), usadas no detalhe e no Gantt. */
@Module({
  imports: [TasksModule, ProjectsModule],
  controllers: [TaskDependenciesController, ProjectDependenciesController],
  providers: [DependenciesService, DependenciesRepository],
  exports: [DependenciesService],
})
export class DependenciesModule {}
