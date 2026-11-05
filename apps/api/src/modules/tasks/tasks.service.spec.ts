import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundError } from '@/core/errors';
import { DomainEvents } from '@/core/events';
import { ProjectsService } from '@/modules/projects/projects.service';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { escapeLike, type TaskRow, TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

const now = new Date('2026-11-04T12:00:00Z');
const ctx = { userId: 'u1', workspaceId: 'w1' };
const task = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: 't1',
  projectId: 'p1',
  title: 'T',
  description: null,
  status: 'todo',
  priority: 'medium',
  assigneeId: null,
  startDate: null,
  dueDate: null,
  position: 1,
  createdBy: 'u1',
  completedAt: null,
  createdAt: now,
  updatedAt: now,
  ...over,
});

describe('TasksService', () => {
  const repo = {
    insert: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    maxPosition: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const projects = { get: jest.fn() };
  const workspaces = { isMember: jest.fn() };
  const events = { emit: jest.fn() };
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    projects.get.mockResolvedValue({ id: 'p1', archivedAt: null });
    workspaces.isMember.mockResolvedValue(true);
    repo.maxPosition.mockResolvedValue(null);
    repo.insert.mockImplementation(async (d) => task(d));
    repo.update.mockImplementation(async (_id, d) => task(d));
    const mod = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repo },
        { provide: ProjectsService, useValue: projects },
        { provide: WorkspacesService, useValue: workspaces },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = mod.get(TasksService);
  });

  describe('create', () => {
    it('começa em todo, na posição 1 da coluna vazia, sem evento se não há responsável', async () => {
      await expect(service.create(ctx, 'p1', { title: 'T' })).resolves.toMatchObject({ status: 'todo', position: 1 });
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('entra no fim da coluna', async () => {
      repo.maxPosition.mockResolvedValue(4);
      await expect(service.create(ctx, 'p1', { title: 'T' })).resolves.toMatchObject({ position: 5 });
    });

    it('tarefa criada como done já recebe completedAt', async () => {
      const created = await service.create(ctx, 'p1', { title: 'T', status: 'done' });
      expect(created.completedAt).not.toBeNull();
    });

    it('recusa projeto arquivado', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
      await expect(service.create(ctx, 'p1', { title: 'T' })).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('recusa responsável de fora do workspace', async () => {
      workspaces.isMember.mockResolvedValue(false);
      await expect(service.create(ctx, 'p1', { title: 'T', assigneeId: 'x' })).rejects.toMatchObject({
        code: 'INVALID_ASSIGNEE',
      });
    });

    it('emite task.assigned quando nasce com responsável', async () => {
      await service.create(ctx, 'p1', { title: 'T', assigneeId: 'u2' });
      expect(events.emit).toHaveBeenCalledWith(
        DomainEvents.TaskAssigned,
        expect.objectContaining({ assigneeId: 'u2', by: 'u1', workspaceId: 'w1' }),
      );
    });
  });

  describe('update', () => {
    it('tarefa de outro workspace → NotFoundError', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service.update(ctx, 't1', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.findById).toHaveBeenCalledWith('w1', 't1');
    });

    it('PATCH vazio devolve a tarefa sem gravar', async () => {
      repo.findById.mockResolvedValue(task());
      await expect(service.update(ctx, 't1', {})).resolves.toMatchObject({ id: 't1' });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('confere as datas com o valor já salvo', async () => {
      repo.findById.mockResolvedValue(task({ startDate: '2026-12-10' }));
      await expect(service.update(ctx, 't1', { dueDate: '2026-12-01' })).rejects.toMatchObject({
        code: 'INVALID_DATE_RANGE',
      });
    });

    it('limpar a data com null libera a outra', async () => {
      repo.findById.mockResolvedValue(task({ startDate: '2026-12-10', dueDate: '2026-12-20' }));
      await expect(service.update(ctx, 't1', { startDate: null, dueDate: '2026-12-01' })).resolves.toBeDefined();
    });

    it('concluir: vai para o fim da coluna, marca completedAt e emite o evento', async () => {
      repo.findById.mockResolvedValue(task());
      repo.maxPosition.mockResolvedValue(2);
      await service.update(ctx, 't1', { status: 'done' });
      const patch = repo.update.mock.calls[0][1];
      expect(patch.position).toBe(3);
      expect(patch.completedAt).toBeInstanceOf(Date);
      expect(events.emit).toHaveBeenCalledWith(
        DomainEvents.TaskStatusChanged,
        expect.objectContaining({ from: 'todo', to: 'done' }),
      );
    });

    it('reabrir limpa completedAt', async () => {
      repo.findById.mockResolvedValue(task({ status: 'done', completedAt: now }));
      await service.update(ctx, 't1', { status: 'todo' });
      expect(repo.update.mock.calls[0][1].completedAt).toBeNull();
    });

    it('mesmo status e mesmo responsável: sem evento e sem mudar posição', async () => {
      repo.findById.mockResolvedValue(task({ assigneeId: 'u2' }));
      await service.update(ctx, 't1', { status: 'todo', assigneeId: 'u2' });
      expect(repo.update.mock.calls[0][1]).not.toHaveProperty('position');
      expect(workspaces.isMember).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('tirar o responsável não emite task.assigned', async () => {
      repo.findById.mockResolvedValue(task({ assigneeId: 'u2' }));
      await service.update(ctx, 't1', { assigneeId: null });
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  it('findOne devolve null fora do workspace', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(service.findOne('w1', 't1')).resolves.toBeNull();
  });

  it('delete confere o workspace antes de apagar', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(service.delete('w1', 't1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe('escapeLike', () => {
  it('escapa os curingas', () => {
    expect(escapeLike('50%_a')).toBe('50\\%\\_a');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });
});
