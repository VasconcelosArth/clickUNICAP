import { Test } from '@nestjs/testing';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { CustomFieldsRepository } from './custom-fields.repository';
import { CustomFieldsService } from './custom-fields.service';

const W = 'workspace-1';
const P = 'project-1';
const T = 'task-1';
const FIELD = 'field-1';
const now = new Date('2026-11-20T12:00:00.000Z');
const field = (overrides: Record<string, unknown> = {}) => ({
  id: FIELD,
  projectId: P,
  name: 'Categoria',
  type: 'dropdown',
  options: ['A', 'B'],
  isRequired: false,
  position: 0,
  createdAt: now,
  ...overrides,
});

describe('CustomFieldsService', () => {
  const repo = {
    listForProject: jest.fn(),
    findField: jest.fn(),
    insertLocked: jest.fn(),
    updateLocked: jest.fn(),
    delete: jest.fn(),
    listTaskValues: jest.fn(),
    listProjectValues: jest.fn(),
    listValuesForField: jest.fn(),
    upsertTaskValues: jest.fn(),
  };
  const projects = { get: jest.fn() };
  const tasks = { findOne: jest.fn() };
  let service: CustomFieldsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    projects.get.mockResolvedValue({ id: P, archivedAt: null });
    repo.listForProject.mockResolvedValue([]);
    // Os métodos "Locked" entregam os campos atuais do projeto (aqui, os de listForProject) ao callback do service.
    repo.insertLocked.mockImplementation(async (_w, _p, build) => ({
      ...build(await repo.listForProject()),
      id: FIELD,
      createdAt: now,
    }));
    repo.findField.mockResolvedValue(field());
    repo.updateLocked.mockImplementation(async (_w, _p, _id, input, check) => {
      check(await repo.listForProject());
      return field(input);
    });
    repo.delete.mockResolvedValue(true);
    tasks.findOne.mockResolvedValue({ id: T, projectId: P });
    repo.listTaskValues.mockResolvedValue([]);
    repo.listValuesForField.mockResolvedValue([]);
    repo.upsertTaskValues.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        { provide: CustomFieldsRepository, useValue: repo },
        { provide: ProjectsService, useValue: projects },
        { provide: TasksService, useValue: tasks },
      ],
    }).compile();
    service = module.get(CustomFieldsService);
  });

  it('creates a field and assigns the next position', async () => {
    repo.listForProject.mockResolvedValue([field({ id: 'other', name: 'Outro', position: 0 })]);
    await expect(
      service.create(W, P, { name: 'Categoria', type: 'dropdown', options: ['A', 'B'], isRequired: false }),
    ).resolves.toMatchObject({ id: FIELD, projectId: P, name: 'Categoria', position: 1, options: ['A', 'B'] });
    expect(repo.insertLocked).toHaveBeenCalledWith(W, P, expect.any(Function));
  });

  it('starts at position 0 when the project has no fields', async () => {
    await expect(service.create(W, P, { name: 'Primeiro', type: 'text', isRequired: false })).resolves.toMatchObject({
      position: 0,
      options: null,
    });
  });

  it('rejects creation in an archived project', async () => {
    projects.get.mockResolvedValue({ id: P, archivedAt: now.toISOString() });
    await expect(service.create(W, P, { name: 'Campo', type: 'text', isRequired: false })).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
      statusCode: 409,
    });
    expect(repo.insertLocked).not.toHaveBeenCalled();
  });

  it('rejects duplicate field names in the same project (checked inside the locked transaction)', async () => {
    repo.listForProject.mockResolvedValue([field({ name: 'categoria' })]);
    await expect(service.create(W, P, { name: 'Categoria', type: 'text', isRequired: false })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('rejects renaming to a name used by another field, but allows keeping its own name', async () => {
    repo.listForProject.mockResolvedValue([field(), field({ id: 'field-2', name: 'Prazo interno' })]);
    await expect(service.update(W, FIELD, { name: 'PRAZO INTERNO' })).rejects.toMatchObject({
      code: 'CUSTOM_FIELD_NAME_EXISTS',
    });
    await expect(service.update(W, FIELD, { name: 'categoria' })).resolves.toMatchObject({ name: 'categoria' });
  });

  it('returns 404 when updating a field outside the workspace', async () => {
    repo.findField.mockResolvedValue(undefined);
    await expect(service.update(W, FIELD, { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.updateLocked).not.toHaveBeenCalled();
  });

  it('groups project values by task', async () => {
    repo.listProjectValues.mockResolvedValue([
      { taskId: T, fieldId: FIELD, value: 'A' },
      { taskId: T, fieldId: 'field-2', value: 3 },
      { taskId: 'task-2', fieldId: FIELD, value: null },
    ]);
    await expect(service.listProjectValues(W, P)).resolves.toEqual({
      [T]: { [FIELD]: 'A', 'field-2': 3 },
      'task-2': { [FIELD]: null },
    });
    expect(projects.get).toHaveBeenCalledWith(W, P);
    expect(repo.listProjectValues).toHaveBeenCalledWith(W, P);
  });

  it('does not list project values when the project is outside the workspace', async () => {
    projects.get.mockRejectedValue(new NotFoundError('Projeto', P));
    await expect(service.listProjectValues(W, P)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.listProjectValues).not.toHaveBeenCalled();
  });

  it('rejects removing a dropdown option already used by a task', async () => {
    repo.listValuesForField.mockResolvedValue([{ taskId: T, fieldId: FIELD, value: 'B' }]);
    await expect(service.update(W, FIELD, { options: ['A'] })).rejects.toMatchObject({ code: 'OPTION_IN_USE' });
    expect(repo.updateLocked).not.toHaveBeenCalled();
  });

  it('rejects values for fields outside the task project', async () => {
    repo.listForProject.mockResolvedValue([]);
    await expect(service.updateTaskValues(W, T, { [FIELD]: 'A' })).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.upsertTaskValues).not.toHaveBeenCalled();
  });

  it('validates dropdown values before persisting', async () => {
    repo.listForProject.mockResolvedValue([field()]);
    await expect(service.updateTaskValues(W, T, { [FIELD]: 'invalid' })).rejects.toBeInstanceOf(DomainError);
    expect(repo.upsertTaskValues).not.toHaveBeenCalled();
  });

  it('persists valid task values and returns the saved map', async () => {
    repo.listForProject.mockResolvedValue([field()]);
    repo.listTaskValues.mockResolvedValue([{ taskId: T, fieldId: FIELD, value: 'A' }]);
    await expect(service.updateTaskValues(W, T, { [FIELD]: 'A' })).resolves.toEqual({ [FIELD]: 'A' });
    expect(repo.upsertTaskValues).toHaveBeenCalledWith(T, [{ fieldId: FIELD, value: 'A' }]);
  });

  it('rejects false for a required checkbox', async () => {
    repo.listForProject.mockResolvedValue([field({ type: 'checkbox', options: null, isRequired: true })]);

    await expect(service.updateTaskValues(W, T, { [FIELD]: false })).rejects.toMatchObject({
      code: 'REQUIRED_FIELD',
      statusCode: 400,
    });

    expect(repo.upsertTaskValues).not.toHaveBeenCalled();
  });
});
