import { Injectable } from '@nestjs/common';
import type { CreateProjectInput, Project, UpdateProjectInput } from '@clickunicap/shared';
import { NotFoundError } from '@/core/errors';
import { type ProjectRow, ProjectsRepository } from './projects.repository';

export function toProjectDto(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    color: row.color,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Projetos são arquivados, nunca apagados. É exportado para o módulo de tarefas. */
@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async create(ctx: { userId: string; workspaceId: string }, input: CreateProjectInput): Promise<Project> {
    return toProjectDto(await this.repo.insert({ ...input, workspaceId: ctx.workspaceId, createdBy: ctx.userId }));
  }

  async list(workspaceId: string, includeArchived: boolean): Promise<Project[]> {
    return (await this.repo.list(workspaceId, includeArchived)).map(toProjectDto);
  }

  async get(workspaceId: string, id: string): Promise<Project> {
    const row = await this.repo.findById(workspaceId, id);
    if (!row) throw new NotFoundError('Projeto', id);
    return toProjectDto(row);
  }

  async update(workspaceId: string, id: string, input: UpdateProjectInput): Promise<Project> {
    if (Object.keys(input).length === 0) return this.get(workspaceId, id);
    return this.save(workspaceId, id, input);
  }

  archive(workspaceId: string, id: string): Promise<Project> {
    return this.save(workspaceId, id, { archivedAt: new Date() });
  }

  unarchive(workspaceId: string, id: string): Promise<Project> {
    return this.save(workspaceId, id, { archivedAt: null });
  }

  private async save(workspaceId: string, id: string, data: Parameters<ProjectsRepository['update']>[2]) {
    const row = await this.repo.update(workspaceId, id, data);
    if (!row) throw new NotFoundError('Projeto', id);
    return toProjectDto(row);
  }
}
