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
    moveTask: jest.fn(),
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
    repo.update.mockImplementation(async (_workspaceId, _id, d) => task(d));
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
      expect(repo.update.mock.calls[0].slice(0, 2)).toEqual(['w1', 't1']);
      const patch = repo.update.mock.calls[0][2];
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
      expect(repo.update.mock.calls[0][2].completedAt).toBeNull();
    });

    it('mesmo status e mesmo responsável: sem evento e sem mudar posição', async () => {
      repo.findById.mockResolvedValue(task({ assigneeId: 'u2' }));
      await service.update(ctx, 't1', { status: 'todo', assigneeId: 'u2' });
      expect(repo.update.mock.calls[0][2]).not.toHaveProperty('position');
      expect(workspaces.isMember).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('tirar o responsável não emite task.assigned', async () => {
      repo.findById.mockResolvedValue(task({ assigneeId: 'u2' }));
      await service.update(ctx, 't1', { assigneeId: null });
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('projeto arquivado é somente leitura', async () => {
      repo.findById.mockResolvedValue(task());
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
      await expect(service.update(ctx, 't1', { title: 'x' })).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('move', () => {
    /** Simula o repository: roda o `plan` do service sobre a coluna dada, como faria dentro da transação. */
    const runMove = (current: TaskRow, column: TaskRow[]) => {
      repo.findById.mockResolvedValue(current);
      repo.moveTask.mockImplementation(async (_ws, _id, _status, plan) => {
        const { patch } = plan(current, column);
        return { before: current, after: task({ ...current, ...patch }) };
      });
    };
    const colTask = (id: string, position: number, over: Partial<TaskRow> = {}) => task({ id, position, ...over });

    it('troca de coluna: muda status, posiciona entre os vizinhos, marca completedAt e emite evento', async () => {
      const current = task({ id: 't1', status: 'todo', position: 1 });
      runMove(current, [colTask('a', 1, { status: 'in_progress' }), colTask('b', 2, { status: 'in_progress' })]);

      const moved = await service.move(ctx, 't1', {
        status: 'in_progress',
        beforeTaskId: 'a',
        afterTaskId: 'b',
      });

      expect(moved).toMatchObject({ status: 'in_progress', position: 1.5 });
      expect(moved.completedAt).toBeNull();
      expect(events.emit).toHaveBeenCalledWith(
        DomainEvents.TaskStatusChanged,
        expect.objectContaining({ taskId: 't1', from: 'todo', to: 'in_progress', by: 'u1', workspaceId: 'w1' }),
      );
    });

    it('concluir pelo Kanban marca completedAt', async () => {
      const current = task({ id: 't1', status: 'in_progress' });
      runMove(current, []);
      const moved = await service.move(ctx, 't1', { status: 'done', beforeTaskId: null, afterTaskId: null });
      expect(moved.status).toBe('done');
      expect(moved.completedAt).not.toBeNull();
    });

    it('reabrir pelo Kanban limpa completedAt', async () => {
      const current = task({ id: 't1', status: 'done', completedAt: now });
      runMove(current, []);
      const moved = await service.move(ctx, 't1', { status: 'todo', beforeTaskId: null, afterTaskId: null });
      expect(moved.completedAt).toBeNull();
    });

    it('reordenar na mesma coluna: sem evento e sem mudar completedAt', async () => {
      const current = task({ id: 't1', status: 'todo', position: 1 });
      runMove(current, [colTask('t1', 1), colTask('a', 2), colTask('b', 3)]);

      const moved = await service.move(ctx, 't1', { status: 'todo', beforeTaskId: 'a', afterTaskId: 'b' });

      expect(moved.position).toBe(2.5);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('sem vizinhos entra no fim da coluna', async () => {
      const current = task({ id: 't1', status: 'todo', position: 1 });
      runMove(current, [colTask('a', 1), colTask('b', 4)]);
      const moved = await service.move(ctx, 't1', { status: 'todo', beforeTaskId: null, afterTaskId: null });
      expect(moved.position).toBe(5);
    });

    it('tarefa de outro workspace → NotFoundError, sem tocar no repository de escrita', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(
        service.move(ctx, 't1', { status: 'done', beforeTaskId: null, afterTaskId: null }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.moveTask).not.toHaveBeenCalled();
    });

    it('projeto arquivado → PROJECT_ARCHIVED, sem mover', async () => {
      repo.findById.mockResolvedValue(task());
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
      await expect(
        service.move(ctx, 't1', { status: 'done', beforeTaskId: null, afterTaskId: null }),
      ).rejects.toMatchObject({
        code: 'PROJECT_ARCHIVED',
      });
      expect(repo.moveTask).not.toHaveBeenCalled();
    });

    it('a tarefa não pode ser vizinha de si mesma → INVALID_NEIGHBOR', async () => {
      repo.findById.mockResolvedValue(task());
      await expect(
        service.move(ctx, 't1', { status: 'todo', beforeTaskId: 't1', afterTaskId: null }),
      ).rejects.toMatchObject({
        code: 'INVALID_NEIGHBOR',
        statusCode: 400,
      });
      expect(repo.moveTask).not.toHaveBeenCalled();
    });

    it('vizinho desatualizado vira POSITION_CHANGED (erro do plano propagado)', async () => {
      const current = task({ id: 't1', status: 'todo', position: 1 });
      runMove(current, [colTask('a', 1), colTask('b', 2), colTask('c', 3)]);
      await expect(
        service.move(ctx, 't1', { status: 'todo', beforeTaskId: 'a', afterTaskId: 'c' }),
      ).rejects.toMatchObject({
        code: 'POSITION_CHANGED',
        statusCode: 409,
      });
    });
  });

  it('delete recusa tarefa de projeto arquivado', async () => {
    repo.findById.mockResolvedValue(task());
    projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
    await expect(service.delete('w1', 't1')).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('delete apaga dentro do workspace', async () => {
    repo.findById.mockResolvedValue(task());
    await service.delete('w1', 't1');
    expect(repo.delete).toHaveBeenCalledWith('w1', 't1');
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
