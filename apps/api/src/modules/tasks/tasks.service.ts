import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
  MoveTaskInput,
} from '@clickunicap/shared';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { DomainEvents, type TaskAssignedPayload, type TaskStatusChangedPayload } from '@/core/events';
import { ProjectsService } from '@/modules/projects/projects.service';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { type NewTaskRow, type TaskRow, TasksRepository } from './tasks.repository';
import { placeInColumn } from './utils/position';

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
    await this.assertNotArchived(ctx.workspaceId, projectId);
    await this.assertAssignee(ctx.workspaceId, input.assigneeId);

    const status = input.status ?? 'todo';
    const row = await this.repo.insert({
      ...input,
      projectId,
      status,
      position: await this.endOfColumn(ctx.workspaceId, projectId, status),
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
    await this.assertNotArchived(ctx.workspaceId, current.projectId);

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
      patch.position = await this.endOfColumn(ctx.workspaceId, current.projectId, input.status);
      patch.completedAt = input.status === 'done' ? new Date() : null;
    }

    const row = await this.repo.update(ctx.workspaceId, taskId, patch);
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

  /**
   * Move a tarefa no Kanban: pode mudar de coluna (status) e/ou de lugar dentro dela.
   * Os vizinhos informados dizem onde ela cai. Sem vizinhos, vai para o fim da coluna.
   */
  async move(ctx: TaskContext, taskId: string, input: MoveTaskInput): Promise<Task> {
    const current = await this.mustFind(ctx.workspaceId, taskId);
    await this.assertNotArchived(ctx.workspaceId, current.projectId);
    if (input.beforeTaskId === taskId || input.afterTaskId === taskId) {
      throw new DomainError('A tarefa não pode ser vizinha de si mesma', 'INVALID_NEIGHBOR', 400);
    }

    const result = await this.repo.moveTask(ctx.workspaceId, taskId, input.status, (task, column) => {
      const placement = placeInColumn(
        column.filter((t) => t.id !== task.id),
        input,
      );
      const statusChanged = task.status !== input.status;
      return {
        patch: {
          status: input.status,
          position: placement.position,
          ...(statusChanged ? { completedAt: input.status === 'done' ? new Date() : null } : {}),
        },
        renumber: placement.renumber,
      };
    });
    if (!result) throw new NotFoundError('Tarefa', taskId);

    const { before, after } = result;
    if (before.status !== after.status) {
      const payload: TaskStatusChangedPayload = {
        taskId: after.id,
        from: before.status,
        to: after.status,
        by: ctx.userId,
        workspaceId: ctx.workspaceId,
      };
      this.events.emit(DomainEvents.TaskStatusChanged, payload);
    }
    return toTaskDto(after);
  }

  async delete(workspaceId: string, taskId: string): Promise<void> {
    const current = await this.mustFind(workspaceId, taskId);
    await this.assertNotArchived(workspaceId, current.projectId);
    await this.repo.delete(workspaceId, taskId);
  }

  private async mustFind(workspaceId: string, taskId: string): Promise<TaskRow> {
    const row = await this.repo.findById(workspaceId, taskId);
    if (!row) throw new NotFoundError('Tarefa', taskId);
    return row;
  }

  /** Projeto arquivado é somente leitura: desarquive para mexer nas tarefas. */
  private async assertNotArchived(workspaceId: string, projectId: string) {
    const project = await this.projects.get(workspaceId, projectId);
    if (project.archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
  }

  private async assertAssignee(workspaceId: string, assigneeId: string | null | undefined) {
    if (assigneeId && !(await this.workspaces.isMember(workspaceId, assigneeId))) {
      throw new DomainError('O responsável precisa ser membro do workspace', 'INVALID_ASSIGNEE', 400);
    }
  }

  private async endOfColumn(workspaceId: string, projectId: string, status: TaskStatus): Promise<number> {
    return ((await this.repo.maxPosition(workspaceId, projectId, status)) ?? 0) + 1;
  }

  private emitAssigned(ctx: TaskContext, taskId: string, assigneeId: string) {
    const payload: TaskAssignedPayload = { taskId, assigneeId, by: ctx.userId, workspaceId: ctx.workspaceId };
    this.events.emit(DomainEvents.TaskAssigned, payload);
  }
}
