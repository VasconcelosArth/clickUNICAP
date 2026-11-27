import { Module } from '@nestjs/common';
import { SubtasksController } from './subtasks.controller';
import { SubtasksRepository } from './subtasks.repository';
import { SubtasksService } from './subtasks.service';

@Module({
  controllers: [SubtasksController],
  providers: [SubtasksService, SubtasksRepository],
  exports: [SubtasksService],
})
export class SubtasksModule {}
