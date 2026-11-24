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
    maxPosition: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listTaskValues: jest.fn(),
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
    repo.maxPosition.mockResolvedValue(0);
    repo.insert.mockImplementation(async (input) => ({ ...input, id: FIELD, createdAt: now }));
    repo.findField.mockResolvedValue(field());
    repo.update.mockImplementation(async (_w, _id, input) => field(input));
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
    await expect(
      service.create(W, P, { name: 'Categoria', type: 'dropdown', options: ['A', 'B'], isRequired: false }),
    ).resolves.toMatchObject({ id: FIELD, projectId: P, name: 'Categoria', position: 1, options: ['A', 'B'] });
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ projectId: P, position: 1 }));
  });

  it('rejects creation in an archived project', async () => {
    projects.get.mockResolvedValue({ id: P, archivedAt: now.toISOString() });
    await expect(service.create(W, P, { name: 'Campo', type: 'text', isRequired: false })).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
      statusCode: 409,
    });
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('rejects duplicate field names in the same project', async () => {
    repo.listForProject.mockResolvedValue([field({ name: 'categoria' })]);
    await expect(service.create(W, P, { name: 'Categoria', type: 'text', isRequired: false })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('rejects removing a dropdown option already used by a task', async () => {
    repo.listValuesForField.mockResolvedValue([{ taskId: T, fieldId: FIELD, value: 'B' }]);
    await expect(service.update(W, FIELD, { options: ['A'] })).rejects.toMatchObject({ code: 'OPTION_IN_USE' });
    expect(repo.update).not.toHaveBeenCalled();
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
});
