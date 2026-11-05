import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsQuery,
  type UpdateProjectInput,
} from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentWorkspace, Roles, RolesGuard, WorkspaceMemberGuard } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { ProjectsService } from './projects.service';

/** /api/projects — o workspace vem do header X-Workspace-Id. */
@ApiTags('projects')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @ZodResponse(projectSchema, 201)
  create(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @ZodBody(createProjectSchema) body: CreateProjectInput,
  ) {
    return this.service.create({ userId: user.id, workspaceId }, body);
  }

  @Get()
  @ZodResponse(z.array(projectSchema))
  list(
    @CurrentWorkspace() workspaceId: string,
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery,
  ) {
    return this.service.list(workspaceId, query.includeArchived);
  }

  @Get(':id')
  @ZodResponse(projectSchema)
  get(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(workspaceId, id);
  }

  @Patch(':id')
  @ZodResponse(projectSchema)
  update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateProjectSchema) body: UpdateProjectInput,
  ) {
    return this.service.update(workspaceId, id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ZodResponse(projectSchema)
  archive(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(workspaceId, id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ZodResponse(projectSchema)
  unarchive(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.unarchive(workspaceId, id);
  }
}
