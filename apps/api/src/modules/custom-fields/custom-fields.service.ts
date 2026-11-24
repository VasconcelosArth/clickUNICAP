import { Injectable } from '@nestjs/common';
import type { CreateCustomFieldInput, CustomField, UpdateCustomFieldInput } from '@clickunicap/shared';
import { customFieldDateValueSchema } from '@clickunicap/shared';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { CustomFieldsRepository, type CustomFieldRow } from './custom-fields.repository';

export function toCustomFieldDto(row: CustomFieldRow): CustomField {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type,
    options: row.options,
    isRequired: row.isRequired,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly repo: CustomFieldsRepository,
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
  ) {}

  async listForProject(workspaceId: string, projectId: string): Promise<CustomField[]> {
    await this.projects.get(workspaceId, projectId);
    return (await this.repo.listForProject(workspaceId, projectId)).map(toCustomFieldDto);
  }

  async create(workspaceId: string, projectId: string, input: CreateCustomFieldInput): Promise<CustomField> {
    const project = await this.projects.get(workspaceId, projectId);
    this.assertNotArchived(project.archivedAt);
    await this.assertUniqueName(workspaceId, projectId, input.name);
    const position = input.position ?? ((await this.repo.maxPosition(workspaceId, projectId)) ?? -1) + 1;
    const row = await this.repo.insert({
      projectId,
      name: input.name,
      type: input.type,
      options: input.type === 'dropdown' ? (input.options ?? []) : null,
      isRequired: input.isRequired,
      position,
    });
    return toCustomFieldDto(row);
  }

  async update(workspaceId: string, fieldId: string, input: UpdateCustomFieldInput): Promise<CustomField> {
    const field = await this.mustFindField(workspaceId, fieldId);
    const project = await this.projects.get(workspaceId, field.projectId);
    this.assertNotArchived(project.archivedAt);
    if (input.name) await this.assertUniqueName(workspaceId, field.projectId, input.name, fieldId);

    if (input.options && field.type !== 'dropdown') {
      throw new DomainError('Este campo não possui opções', 'FIELD_NOT_DROPDOWN', 400);
    }
    const options = input.options;
    if (options && field.type === 'dropdown') {
      const currentValues = await this.repo.listValuesForField(workspaceId, fieldId);
      const removed = currentValues.some((row) => row.value !== null && !options.includes(String(row.value)));
      if (removed)
        throw new ConflictError('Não é possível remover opções que já estão usadas em tarefas', 'OPTION_IN_USE');
    }

    const row = await this.repo.update(workspaceId, fieldId, input);
    if (!row) throw new NotFoundError('Campo personalizado', fieldId);
    return toCustomFieldDto(row);
  }

  async delete(workspaceId: string, fieldId: string): Promise<void> {
    const field = await this.mustFindField(workspaceId, fieldId);
    const project = await this.projects.get(workspaceId, field.projectId);
    this.assertNotArchived(project.archivedAt);
    if (!(await this.repo.delete(workspaceId, fieldId))) throw new NotFoundError('Campo personalizado', fieldId);
  }

  async getTaskValues(workspaceId: string, taskId: string): Promise<Record<string, string | number | boolean | null>> {
    const task = await this.tasks.findOne(workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    const rows = await this.repo.listTaskValues(workspaceId, taskId);
    return Object.fromEntries(rows.map((row) => [row.fieldId, row.value]));
  }

  async updateTaskValues(
    workspaceId: string,
    taskId: string,
    values: Record<string, string | number | boolean | null>,
  ) {
    const task = await this.tasks.findOne(workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    const project = await this.projects.get(workspaceId, task.projectId);
    this.assertNotArchived(project.archivedAt);
    const fields = await this.repo.listForProject(workspaceId, task.projectId);
    const fieldById = new Map(fields.map((field) => [field.id, field]));

    const entries = Object.entries(values).map(([fieldId, value]) => {
      const field = fieldById.get(fieldId);
      if (!field) throw new NotFoundError('Campo personalizado', fieldId);
      this.validateValue(field, value);
      return { fieldId, value };
    });

    await this.repo.upsertTaskValues(taskId, entries);
    return this.getTaskValues(workspaceId, taskId);
  }

  private validateValue(field: CustomFieldRow, value: string | number | boolean | null) {
    if (value === null) {
      if (field.isRequired) throw new DomainError(`O campo "${field.name}" é obrigatório`, 'REQUIRED_FIELD', 400);
      return;
    }
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string')
          throw new DomainError(`O campo "${field.name}" deve ser texto`, 'INVALID_FIELD_VALUE', 400);
        if (field.isRequired && !value.trim())
          throw new DomainError(`O campo "${field.name}" é obrigatório`, 'REQUIRED_FIELD', 400);
        return;
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value))
          throw new DomainError(`O campo "${field.name}" deve ser número`, 'INVALID_FIELD_VALUE', 400);
        return;
      case 'date':
        if (typeof value !== 'string' || !customFieldDateValueSchema.safeParse(value).success) {
          throw new DomainError(`O campo "${field.name}" deve ser uma data válida`, 'INVALID_FIELD_VALUE', 400);
        }
        return;
      case 'dropdown':
        if (typeof value !== 'string' || !(field.options ?? []).includes(value)) {
          throw new DomainError(`Selecione uma opção válida para "${field.name}"`, 'INVALID_FIELD_VALUE', 400);
        }
        return;
      case 'checkbox':
        if (typeof value !== 'boolean') {
          throw new DomainError(`O campo "${field.name}" deve ser verdadeiro ou falso`, 'INVALID_FIELD_VALUE', 400);
        }

        if (field.isRequired && value !== true) {
          throw new DomainError(`O campo "${field.name}" é obrigatório`, 'REQUIRED_FIELD', 400);
        }
        return;
    }
  }

  private async assertUniqueName(workspaceId: string, projectId: string, name: string, exceptId?: string) {
    const fields = await this.repo.listForProject(workspaceId, projectId);
    if (fields.some((field) => field.id !== exceptId && field.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new ConflictError('Já existe um campo com esse nome neste projeto', 'CUSTOM_FIELD_NAME_EXISTS');
    }
  }

  private async mustFindField(workspaceId: string, fieldId: string) {
    const field = await this.repo.findField(workspaceId, fieldId);
    if (!field) throw new NotFoundError('Campo personalizado', fieldId);
    return field;
  }

  private assertNotArchived(archivedAt: string | null) {
    if (archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
  }
}
