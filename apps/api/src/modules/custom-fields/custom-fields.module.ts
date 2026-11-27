import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import {
  CustomFieldsController,
  ProjectCustomFieldsController,
  ProjectCustomFieldValuesController,
  TaskCustomFieldValuesController,
} from './custom-fields.controller';
import { CustomFieldsRepository } from './custom-fields.repository';
import { CustomFieldsService } from './custom-fields.service';

@Module({
  imports: [ProjectsModule, TasksModule],
  controllers: [
    ProjectCustomFieldsController,
    ProjectCustomFieldValuesController,
    CustomFieldsController,
    TaskCustomFieldValuesController,
  ],
  providers: [CustomFieldsService, CustomFieldsRepository],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
