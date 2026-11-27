import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  commentSchema,
  createCommentSchema,
  updateCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
} from '@clickunicap/shared';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentWorkspace, WorkspaceMemberGuard } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@UseGuards(WorkspaceMemberGuard)
@Controller()
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get('tasks/:taskId/comments')
  @ZodResponse(z.array(commentSchema))
  list(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.list(workspaceId, taskId);
  }

  @Post('tasks/:taskId/comments')
  @ZodResponse(commentSchema)
  create(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ZodBody(createCommentSchema)
    @Body(new ZodValidationPipe(createCommentSchema))
    body: CreateCommentInput,
  ) {
    return this.service.create({ userId: user.id, workspaceId }, taskId, body);
  }

  @Patch('comments/:id')
  @ZodResponse(commentSchema)
  update(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateCommentSchema)
    @Body(new ZodValidationPipe(updateCommentSchema))
    body: UpdateCommentInput,
  ) {
    return this.service.update({ userId: user.id, workspaceId }, id, body);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove({ userId: user.id, workspaceId }, id);
  }
}
