import { Module } from '@nestjs/common';
import { AppConfig } from '@/core/config';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { AttachmentsController, TaskAttachmentsController } from './attachments.controller';
import { AttachmentFileInterceptor } from './attachments.interceptor';
import { AttachmentsListener } from './attachments.listener';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';
import { ATTACHMENT_STORAGE } from './storage/attachment-storage';
import { DiskAttachmentStorage } from './storage/disk-attachment-storage';

@Module({
  imports: [TasksModule, ProjectsModule], // to use the exported TasksService and ProjectsService
  controllers: [TaskAttachmentsController, AttachmentsController],
  providers: [
    AttachmentsService,
    AttachmentsRepository,
    AttachmentsListener,
    AttachmentFileInterceptor,
    {
      provide: ATTACHMENT_STORAGE,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new DiskAttachmentStorage(config.uploads.dir),
    },
  ],
})
export class AttachmentsModule {}
