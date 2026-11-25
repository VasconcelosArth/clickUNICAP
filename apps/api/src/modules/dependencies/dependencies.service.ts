import { Injectable } from '@nestjs/common';
import type { CreateTaskDependencyInput, Task, TaskDependencies, TaskDependency } from '@clickunicap/shared';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { DependenciesRepository, type DependencyRow } from './dependencies.repository';
import { wouldCreateCycle } from './utils/cycle';

export function toDependencyDto(row: DependencyRow): TaskDependency {
  return { taskId: row.taskId, dependsOnTaskId: row.dependsOnTaskId, createdAt: row.createdAt.toISOString() };
}

/**
 * Regras de dependência entre tarefas ("esta tarefa espera aquela").
 * As duas tarefas precisam estar no mesmo projeto, e uma dependência nunca pode fechar um ciclo.
 */
@Injectable()
export class DependenciesService {
  constructor(
    private readonly repo: DependenciesRepository,
    private readonly tasks: TasksService,
    private readonly projects: ProjectsService,
  ) {}

  async listForTask(workspaceId: string, taskId: string): Promise<TaskDependencies> {
    await this.mustFindTask(workspaceId, taskId);
    const [blockedBy, blocking] = await Promise.all([
      this.repo.listBlockedBy(workspaceId, taskId),
      this.repo.listBlocking(workspaceId, taskId),
    ]);
    return { blockedBy, blocking };
  }

  async listForProject(workspaceId: string, projectId: string): Promise<TaskDependency[]> {
    await this.projects.get(workspaceId, projectId);
    return (await this.repo.listByProject(workspaceId, projectId)).map(toDependencyDto);
  }

  /** `taskId` passa a esperar `input.dependsOnTaskId` terminar. */
  async create(workspaceId: string, taskId: string, input: CreateTaskDependencyInput): Promise<TaskDependency> {
    const task = await this.mustFindTask(workspaceId, taskId);
    if (input.dependsOnTaskId === taskId) {
      throw new DomainError('Uma tarefa não pode depender dela mesma', 'SELF_DEPENDENCY', 400);
    }
    const blocker = await this.mustFindTask(workspaceId, input.dependsOnTaskId);
    if (blocker.projectId !== task.projectId) {
      throw new DomainError('As duas tarefas precisam estar no mesmo projeto', 'DEPENDENCY_OTHER_PROJECT', 400);
    }
    await this.assertNotArchived(workspaceId, task.projectId);

    const edge = { taskId, dependsOnTaskId: input.dependsOnTaskId };
    const result = await this.repo.insertUnlessCycle(workspaceId, task.projectId, edge, (current) =>
      wouldCreateCycle(current, edge.taskId, edge.dependsOnTaskId),
    );
    if ('rejected' in result) {
      if (result.rejected === 'exists') throw new ConflictError('Esta dependência já existe', 'DEPENDENCY_EXISTS');
      throw new DomainError(
        `"${blocker.title}" já espera por "${task.title}", direta ou indiretamente. A dependência criaria um ciclo.`,
        'CIRCULAR_DEPENDENCY',
        400,
      );
    }
    return toDependencyDto(result.created);
  }

  async delete(workspaceId: string, taskId: string, dependsOnTaskId: string): Promise<void> {
    const task = await this.mustFindTask(workspaceId, taskId);
    await this.assertNotArchived(workspaceId, task.projectId);
    const deleted = await this.repo.delete(workspaceId, taskId, dependsOnTaskId);
    if (!deleted) throw new NotFoundError('Dependência');
  }

  private async mustFindTask(workspaceId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findOne(workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    return task;
  }

  /** Mesma regra das tarefas: projeto arquivado é somente leitura. */
  private async assertNotArchived(workspaceId: string, projectId: string) {
    const project = await this.projects.get(workspaceId, projectId);
    if (project.archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
  }
}
