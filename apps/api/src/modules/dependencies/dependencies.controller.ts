import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  createTaskDependencySchema,
  taskDependenciesSchema,
  taskDependencySchema,
  type CreateTaskDependencyInput,
} from '@clickunicap/shared';
import { CurrentWorkspace, WorkspaceMemberGuard } from '@/core/guards';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { DependenciesService } from './dependencies.service';

/** /api/tasks/:taskId/dependencies — de quem a tarefa depende e quem depende dela. */
@ApiTags('dependencies')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks/:taskId/dependencies')
export class TaskDependenciesController {
  constructor(private readonly service: DependenciesService) {}

  @Get()
  @ZodResponse(taskDependenciesSchema)
  list(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.listForTask(workspaceId, taskId);
  }

  /** A tarefa `:taskId` passa a esperar `dependsOnTaskId` terminar. */
  @Post()
  @ZodResponse(taskDependencySchema, 201)
  create(
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ZodBody(createTaskDependencySchema) body: CreateTaskDependencyInput,
  ) {
    return this.service.create(workspaceId, taskId, body);
  }

  @Delete(':dependsOnTaskId')
  @HttpCode(204)
  delete(
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('dependsOnTaskId', ParseUUIDPipe) dependsOnTaskId: string,
  ) {
    return this.service.delete(workspaceId, taskId, dependsOnTaskId);
  }
}

/** /api/projects/:projectId/dependencies — todas as dependências do projeto, para o Gantt. */
@ApiTags('dependencies')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects/:projectId/dependencies')
export class ProjectDependenciesController {
  constructor(private readonly service: DependenciesService) {}

  @Get()
  @ZodResponse(z.array(taskDependencySchema))
  list(@CurrentWorkspace() workspaceId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.listForProject(workspaceId, projectId);
  }
}
