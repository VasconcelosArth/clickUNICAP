import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createSubtaskSchema,
  subtaskSchema,
  updateSubtaskSchema,
  type CreateSubtaskInput,
  type UpdateSubtaskInput,
} from '@clickunicap/shared';
import { z } from 'zod';
import { CurrentWorkspace, WorkspaceMemberGuard } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { SubtasksService } from './subtasks.service';

@ApiTags('subtasks')
@UseGuards(WorkspaceMemberGuard)
@Controller()
export class SubtasksController {
  constructor(private readonly service: SubtasksService) {}

  @Get('tasks/:taskId/subtasks')
  @ZodResponse(z.array(subtaskSchema))
  list(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.list(workspaceId, taskId);
  }

  @Post('tasks/:taskId/subtasks')
  @ZodResponse(subtaskSchema)
  create(
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ZodBody(createSubtaskSchema)
    @Body(new ZodValidationPipe(createSubtaskSchema))
    body: CreateSubtaskInput,
  ) {
    return this.service.create(workspaceId, taskId, body);
  }

  @Patch('subtasks/:id')
  @ZodResponse(subtaskSchema)
  update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateSubtaskSchema)
    @Body(new ZodValidationPipe(updateSubtaskSchema))
    body: UpdateSubtaskInput,
  ) {
    return this.service.update(workspaceId, id, body);
  }

  @Delete('subtasks/:id')
  @HttpCode(204)
  remove(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(workspaceId, id);
  }
}
