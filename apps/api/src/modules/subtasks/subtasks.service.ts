import { Injectable } from '@nestjs/common';
import type { CreateSubtaskInput, UpdateSubtaskInput } from '@clickunicap/shared';
import { ConflictError, NotFoundError } from '@/core/errors';
import { SubtasksRepository, type SubtaskPatch, type SubtaskRow } from './subtasks.repository';

@Injectable()
export class SubtasksService {
  constructor(private readonly repo: SubtasksRepository) {}

  async list(workspaceId: string, taskId: string): Promise<SubtaskRow[]> {
    const scope = await this.repo.findTaskScope(workspaceId, taskId);
    if (!scope) throw new NotFoundError('Task', taskId);
    return this.repo.listByTask(workspaceId, taskId);
  }

  async create(workspaceId: string, taskId: string, input: CreateSubtaskInput): Promise<SubtaskRow> {
    const scope = await this.repo.findTaskScope(workspaceId, taskId);
    if (!scope) throw new NotFoundError('Task', taskId);
    if (scope.archived) throw this.archivedError();
    return this.repo.insertAtEnd(taskId, input.title);
  }

  async update(workspaceId: string, id: string, input: UpdateSubtaskInput): Promise<SubtaskRow> {
    const found = await this.repo.findById(workspaceId, id);
    if (!found) throw new NotFoundError('Subtask', id);
    if (found.archived) throw this.archivedError();

    const patch: SubtaskPatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.isDone !== undefined) patch.isDone = input.isDone;

    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundError('Subtask', id);
    return updated;
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const found = await this.repo.findById(workspaceId, id);
    if (!found) throw new NotFoundError('Subtask', id);
    if (found.archived) throw this.archivedError();
    await this.repo.remove(id);
  }

  private archivedError(): ConflictError {
    return new ConflictError('Projeto arquivado é somente leitura', 'PROJECT_ARCHIVED');
  }
}
