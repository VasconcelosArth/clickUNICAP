import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createTimeEntrySchema,
  currentTimerSchema,
  startTimerResultSchema,
  taskTimeEntriesSchema,
  timeEntrySchema,
  timeReportQuerySchema,
  timeReportSchema,
  updateTimeEntrySchema,
  type CreateTimeEntryInput,
  type TimeReportQuery,
  type UpdateTimeEntryInput,
} from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentMembership, WorkspaceMemberGuard, type WorkspaceContext } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { TimeTrackingService, type TimeContext } from './time-tracking.service';

const context = (user: AuthUser, ws: WorkspaceContext): TimeContext => ({
  userId: user.id,
  workspaceId: ws.id,
  role: ws.role,
});

/** /api/tasks/:taskId/time-entries — o tempo gasto na tarefa, o timer e o lançamento manual. */
@ApiTags('time-tracking')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks/:taskId/time-entries')
export class TaskTimeEntriesController {
  constructor(private readonly service: TimeTrackingService) {}

  @Get()
  @ZodResponse(taskTimeEntriesSchema)
  list(@CurrentMembership() ws: WorkspaceContext, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.listForTask(ws.id, taskId);
  }

  /** Lançamento manual de tempo. */
  @Post()
  @ZodResponse(timeEntrySchema, 201)
  create(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ZodBody(createTimeEntrySchema) body: CreateTimeEntryInput,
  ) {
    return this.service.create(context(user, ws), taskId, body);
  }

  /** Inicia o timer do usuário nesta tarefa, parando o que estiver ativo em outra tarefa deste workspace. */
  @Post('start')
  @ZodResponse(startTimerResultSchema, 201)
  start(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.service.start(context(user, ws), taskId);
  }
}

/** /api/time-entries — o timer ativo do usuário e a edição de uma entrada. */
@ApiTags('time-tracking')
@UseGuards(WorkspaceMemberGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly service: TimeTrackingService) {}

  @Get('current')
  @ZodResponse(currentTimerSchema)
  current(@CurrentUser() user: AuthUser, @CurrentMembership() ws: WorkspaceContext) {
    return this.service.current(ws.id, user.id);
  }

  @Post('current/stop')
  @HttpCode(200)
  @ZodResponse(timeEntrySchema)
  stop(@CurrentUser() user: AuthUser, @CurrentMembership() ws: WorkspaceContext) {
    return this.service.stop(context(user, ws));
  }

  @Patch(':id')
  @ZodResponse(timeEntrySchema)
  update(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateTimeEntrySchema) body: UpdateTimeEntryInput,
  ) {
    return this.service.update(context(user, ws), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(context(user, ws), id);
  }
}

/** /api/projects/:projectId/time-report — relatório de horas do projeto num período. */
@ApiTags('time-tracking')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects/:projectId/time-report')
export class ProjectTimeReportController {
  constructor(private readonly service: TimeTrackingService) {}

  @Get()
  @ZodResponse(timeReportSchema)
  report(
    @CurrentMembership() ws: WorkspaceContext,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(timeReportQuerySchema)) query: TimeReportQuery,
  ) {
    return this.service.report(ws.id, projectId, query);
  }
}
