import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createCustomFieldSchema,
  customFieldSchema,
  projectCustomFieldValuesSchema,
  taskCustomFieldValuesSchema,
  updateCustomFieldSchema,
  updateTaskCustomFieldValuesSchema,
  type CreateCustomFieldInput,
  type UpdateCustomFieldInput,
  type UpdateTaskCustomFieldValuesInput,
} from '@clickunicap/shared';
import { CurrentWorkspace, Roles, RolesGuard, WorkspaceMemberGuard } from '@/core/guards';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { CustomFieldsService } from './custom-fields.service';

@ApiTags('custom-fields')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects/:projectId/custom-fields')
export class ProjectCustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Get()
  @ZodResponse(customFieldSchema.array())
  list(@CurrentWorkspace() workspaceId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.listForProject(workspaceId, projectId);
  }

  @Post()
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  @ZodResponse(customFieldSchema, 201)
  create(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @ZodBody(createCustomFieldSchema) body: CreateCustomFieldInput,
  ) {
    return this.service.create(workspaceId, projectId, body);
  }
}

@ApiTags('custom-fields')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects/:projectId/custom-field-values')
export class ProjectCustomFieldValuesController {
  constructor(private readonly service: CustomFieldsService) {}

  /** Valores de todas as tarefas do projeto em uma chamada, para as colunas da Lista. */
  @Get()
  @ZodResponse(projectCustomFieldValuesSchema)
  list(@CurrentWorkspace() workspaceId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.listProjectValues(workspaceId, projectId);
  }
}

@ApiTags('custom-fields')
@UseGuards(WorkspaceMemberGuard, RolesGuard)
@Roles('admin')
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Patch(':fieldId')
  @ZodResponse(customFieldSchema)
  update(
    @CurrentWorkspace() workspaceId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @ZodBody(updateCustomFieldSchema) body: UpdateCustomFieldInput,
  ) {
    return this.service.update(workspaceId, fieldId, body);
  }

  @Delete(':fieldId')
  @HttpCode(204)
  delete(@CurrentWorkspace() workspaceId: string, @Param('fieldId', ParseUUIDPipe) fieldId: string) {
    return this.service.delete(workspaceId, fieldId);
  }
}

@ApiTags('custom-fields')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks/:taskId/custom-field-values')
export class TaskCustomFieldValuesController {
  constructor(private readonly service: CustomFieldsService) {}

  @Get()
  @ZodResponse(taskCustomFieldValuesSchema)
  get(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.getTaskValues(workspaceId, taskId);
  }

  @Patch()
  @ZodResponse(taskCustomFieldValuesSchema)
  update(
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ZodBody(updateTaskCustomFieldValuesSchema) body: UpdateTaskCustomFieldValuesInput,
  ) {
    return this.service.updateTaskValues(workspaceId, taskId, body.values);
  }
}
