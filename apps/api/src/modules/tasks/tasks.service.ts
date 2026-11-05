import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateTaskInput, Task, TaskFilters, TaskStatus, UpdateTaskInput } from '@clickunicap/shared';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { DomainEvents, type TaskAssignedPayload, type TaskStatusChangedPayload } from '@/core/events';
import { ProjectsService } from '@/modules/projects/projects.service';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { type NewTaskRow, type TaskRow, TasksRepository } from './tasks.repository';

export interface TaskContext {
  userId: string;
  workspaceId: string;
}

export function toTaskDto(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assigneeId,
    startDate: row.startDate,
    dueDate: row.dueDate,
    position: row.position,
    createdBy: row.createdBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Regras de tarefa. É EXPORTADO: as outras frentes usam `findOne()` para confirmar
 * que a tarefa existe no workspace, em vez de acessar o repository.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly projects: ProjectsService,
    private readonly workspaces: WorkspacesService,
    private readonly events: EventEmitter2,
  ) {}

  async create(ctx: TaskContext, projectId: string, input: CreateTaskInput): Promise<Task> {
    const project = await this.projects.get(ctx.workspaceId, projectId);
    if (project.archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
    await this.assertAssignee(ctx.workspaceId, input.assigneeId);

    const status = input.status ?? 'todo';
    const row = await this.repo.insert({
      ...input,
      projectId,
      status,
      position: await this.endOfColumn(projectId, status),
      completedAt: status === 'done' ? new Date() : null,
      createdBy: ctx.userId,
    });
    if (row.assigneeId) this.emitAssigned(ctx, row.id, row.assigneeId);
    return toTaskDto(row);
  }

  async list(workspaceId: string, projectId: string, filters: TaskFilters): Promise<Task[]> {
    await this.projects.get(workspaceId, projectId);
    return (await this.repo.list(workspaceId, projectId, filters)).map(toTaskDto);
  }

  /** Para outros módulos: devolve null se a tarefa não existir neste workspace. */
  async findOne(workspaceId: string, taskId: string): Promise<Task | null> {
    const row = await this.repo.findById(workspaceId, taskId);
    return row ? toTaskDto(row) : null;
  }

  async get(workspaceId: string, taskId: string): Promise<Task> {
    return toTaskDto(await this.mustFind(workspaceId, taskId));
  }

  async update(ctx: TaskContext, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const current = await this.mustFind(ctx.workspaceId, taskId);
    if (Object.keys(input).length === 0) return toTaskDto(current);

    const startDate = input.startDate === undefined ? current.startDate : input.startDate;
    const dueDate = input.dueDate === undefined ? current.dueDate : input.dueDate;
    if (startDate && dueDate && startDate > dueDate) {
      throw new DomainError('A data de início não pode ser depois do prazo', 'INVALID_DATE_RANGE', 400);
    }

    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== current.assigneeId;
    if (assigneeChanged) await this.assertAssignee(ctx.workspaceId, input.assigneeId);

    const statusChanged = input.status !== undefined && input.status !== current.status;
    const patch: Partial<NewTaskRow> = { ...input };
    if (statusChanged && input.status) {
      patch.position = await this.endOfColumn(current.projectId, input.status);
      patch.completedAt = input.status === 'done' ? new Date() : null;
    }

    const row = await this.repo.update(taskId, patch);
    if (!row) throw new NotFoundError('Tarefa', taskId);

    if (assigneeChanged && row.assigneeId) this.emitAssigned(ctx, row.id, row.assigneeId);
    if (statusChanged) {
      const payload: TaskStatusChangedPayload = {
        taskId: row.id,
        from: current.status,
        to: row.status,
        by: ctx.userId,
        workspaceId: ctx.workspaceId,
      };
      this.events.emit(DomainEvents.TaskStatusChanged, payload);
    }
    return toTaskDto(row);
  }

  async delete(workspaceId: string, taskId: string): Promise<void> {
    await this.mustFind(workspaceId, taskId);
    await this.repo.delete(taskId);
  }

  private async mustFind(workspaceId: string, taskId: string): Promise<TaskRow> {
    const row = await this.repo.findById(workspaceId, taskId);
    if (!row) throw new NotFoundError('Tarefa', taskId);
    return row;
  }

  private async assertAssignee(workspaceId: string, assigneeId: string | null | undefined) {
    if (assigneeId && !(await this.workspaces.isMember(workspaceId, assigneeId))) {
      throw new DomainError('O responsável precisa ser membro do workspace', 'INVALID_ASSIGNEE', 400);
    }
  }

  private async endOfColumn(projectId: string, status: TaskStatus): Promise<number> {
    return ((await this.repo.maxPosition(projectId, status)) ?? 0) + 1;
  }

  private emitAssigned(ctx: TaskContext, taskId: string, assigneeId: string) {
    const payload: TaskAssignedPayload = { taskId, assigneeId, by: ctx.userId, workspaceId: ctx.workspaceId };
    this.events.emit(DomainEvents.TaskAssigned, payload);
  }
}
