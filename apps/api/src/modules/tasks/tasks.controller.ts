import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  createTaskSchema,
  taskFiltersSchema,
  taskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type TaskFilters,
  type UpdateTaskInput,
} from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentWorkspace, WorkspaceMemberGuard } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { TasksService } from './tasks.service';

/** /api/projects/:projectId/tasks — criar e listar. */
@ApiTags('tasks')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @ZodResponse(taskSchema, 201)
  create(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @ZodBody(createTaskSchema) body: CreateTaskInput,
  ) {
    return this.service.create({ userId: user.id, workspaceId }, projectId, body);
  }

  @Get()
  @ZodResponse(z.array(taskSchema))
  list(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(taskFiltersSchema)) filters: TaskFilters,
  ) {
    return this.service.list(workspaceId, projectId, filters);
  }
}

/** /api/tasks/:id — ver, editar e excluir. */
@ApiTags('tasks')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('my')
  @ZodResponse(z.array(taskSchema))
  listMine(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Query(new ZodValidationPipe(taskFiltersSchema)) filters: TaskFilters,
  ) {
    return this.service.listAssignedToUser(workspaceId, user.id, filters);
  }

  @Get(':id')
  @ZodResponse(taskSchema)
  get(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(workspaceId, id);
  }

  @Patch(':id')
  @ZodResponse(taskSchema)
  update(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateTaskSchema) body: UpdateTaskInput,
  ) {
    return this.service.update({ userId: user.id, workspaceId }, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(workspaceId, id);
  }
}
