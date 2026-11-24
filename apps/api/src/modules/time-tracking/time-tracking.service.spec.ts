import { Test } from '@nestjs/testing';
import { ConflictError, ForbiddenError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { TimeTrackingRepository, type TimeEntryRow } from './time-tracking.repository';
import { TimeTrackingService, type TimeContext } from './time-tracking.service';

const NOW = new Date('2026-11-24T15:00:00.000Z');
const W = 'w1';
const ana: TimeContext = { userId: 'ana', workspaceId: W, role: 'member' };
const bia: TimeContext = { userId: 'bia', workspaceId: W, role: 'member' };
const admin: TimeContext = { userId: 'adm', workspaceId: W, role: 'admin' };

const row = (over: Partial<TimeEntryRow> = {}): TimeEntryRow => ({
  id: 'e1',
  taskId: 't1',
  userId: 'ana',
  userName: 'Ana',
  startedAt: new Date('2026-11-24T14:00:00.000Z'),
  endedAt: new Date('2026-11-24T14:30:00.000Z'),
  minutes: 30,
  note: null,
  createdAt: new Date('2026-11-24T14:30:00.000Z'),
  projectId: 'p1',
  taskTitle: 'Montar a vitrine',
  ...over,
});
const running = (over: Partial<TimeEntryRow> = {}) => row({ endedAt: null, minutes: null, ...over });

describe('TimeTrackingService', () => {
  const repo = {
    listByTask: jest.fn(),
    findById: jest.fn(),
    findRunning: jest.fn(),
    insert: jest.fn(),
    stop: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const tasks = { findOne: jest.fn() };
  const projects = { get: jest.fn() };
  let service: TimeTrackingService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    tasks.findOne.mockImplementation(async (_w: string, id: string) => ({ id, projectId: 'p1', title: 'Tarefa' }));
    projects.get.mockResolvedValue({ id: 'p1', archivedAt: null });
    repo.insert.mockResolvedValue({ id: 'e1' });
    repo.findById.mockResolvedValue(row());
    repo.stop.mockResolvedValue(true);
    repo.update.mockResolvedValue(true);
    repo.delete.mockResolvedValue(true);
    const mod = await Test.createTestingModule({
      providers: [
        TimeTrackingService,
        { provide: TimeTrackingRepository, useValue: repo },
        { provide: TasksService, useValue: tasks },
        { provide: ProjectsService, useValue: projects },
      ],
    }).compile();
    service = mod.get(TimeTrackingService);
  });

  afterEach(() => jest.useRealTimers());

  describe('listForTask', () => {
    it('devolve as entradas em ISO e soma só as paradas', async () => {
      repo.listByTask.mockResolvedValue([row({ minutes: 30 }), row({ id: 'e2', minutes: 15 }), running({ id: 'e3' })]);

      const res = await service.listForTask(W, 't1');

      expect(res.totalMinutes).toBe(45);
      expect(res.entries).toHaveLength(3);
      expect(res.entries[0]).toEqual({
        id: 'e1',
        taskId: 't1',
        userId: 'ana',
        userName: 'Ana',
        startedAt: '2026-11-24T14:00:00.000Z',
        endedAt: '2026-11-24T14:30:00.000Z',
        minutes: 30,
        note: null,
        createdAt: '2026-11-24T14:30:00.000Z',
      });
      expect(res.entries[2]).toMatchObject({ endedAt: null, minutes: null });
    });

    it('tarefa inexistente no workspace → NotFoundError', async () => {
      tasks.findOne.mockResolvedValue(null);
      await expect(service.listForTask(W, 't1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.listByTask).not.toHaveBeenCalled();
    });
  });

  describe('current', () => {
    it('devolve o timer ativo com o título da tarefa, ou null', async () => {
      repo.findRunning.mockResolvedValueOnce(running());
      await expect(service.current(W, 'ana')).resolves.toEqual({
        timer: expect.objectContaining({ id: 'e1', endedAt: null, taskTitle: 'Montar a vitrine' }),
      });

      repo.findRunning.mockResolvedValueOnce(undefined);
      await expect(service.current(W, 'ana')).resolves.toEqual({ timer: null });
    });
  });

  describe('start', () => {
    it('grava o início agora, para o usuário logado', async () => {
      repo.findById.mockResolvedValue(running());

      await expect(service.start(ana, 't1')).resolves.toMatchObject({ id: 'e1', endedAt: null });
      expect(repo.insert).toHaveBeenCalledWith({ taskId: 't1', userId: 'ana', startedAt: NOW });
    });

    it('com outro timer ativo → TIMER_ALREADY_RUNNING (409)', async () => {
      repo.insert.mockResolvedValue(undefined);
      await expect(service.start(ana, 't1')).rejects.toMatchObject({ code: 'TIMER_ALREADY_RUNNING', statusCode: 409 });
    });

    it('tarefa de outro workspace → NotFoundError', async () => {
      tasks.findOne.mockResolvedValue(null);
      await expect(service.start(ana, 't1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('projeto arquivado → PROJECT_ARCHIVED', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: '2026-11-01T00:00:00.000Z' });
      await expect(service.start(ana, 't1')).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('grava o fim agora e os minutos arredondados para baixo', async () => {
      repo.findRunning.mockResolvedValue(running({ startedAt: new Date('2026-11-24T14:17:40.000Z') }));

      await service.stop(ana);

      expect(repo.stop).toHaveBeenCalledWith(W, 'e1', NOW, 42);
    });

    it('sem timer ativo → NotFoundError', async () => {
      repo.findRunning.mockResolvedValue(undefined);
      await expect(service.stop(ana)).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.stop).not.toHaveBeenCalled();
    });

    it('timer parado por outra requisição ao mesmo tempo → NotFoundError', async () => {
      repo.findRunning.mockResolvedValue(running());
      repo.stop.mockResolvedValue(false);
      await expect(service.stop(ana)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('funciona mesmo com o projeto arquivado', async () => {
      repo.findRunning.mockResolvedValue(running());
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: '2026-11-01T00:00:00.000Z' });
      await expect(service.stop(ana)).resolves.toMatchObject({ id: 'e1' });
    });
  });

  describe('create (lançamento manual)', () => {
    it('sem início, o tempo termina agora', async () => {
      await service.create(ana, 't1', { minutes: 90, note: 'Reunião' });
      expect(repo.insert).toHaveBeenCalledWith({
        taskId: 't1',
        userId: 'ana',
        startedAt: new Date('2026-11-24T13:30:00.000Z'),
        endedAt: NOW,
        minutes: 90,
        note: 'Reunião',
      });
    });

    it('com início, calcula o fim pelos minutos', async () => {
      await service.create(ana, 't1', { minutes: 30, startedAt: '2026-11-23T09:00:00.000Z' });
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          startedAt: new Date('2026-11-23T09:00:00.000Z'),
          endedAt: new Date('2026-11-23T09:30:00.000Z'),
          note: null,
        }),
      );
    });

    it('terminar no futuro → TIME_ENTRY_IN_FUTURE (400)', async () => {
      await expect(
        service.create(ana, 't1', { minutes: 30, startedAt: '2026-11-24T14:45:00.000Z' }),
      ).rejects.toMatchObject({ code: 'TIME_ENTRY_IN_FUTURE', statusCode: 400 });
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('projeto arquivado → PROJECT_ARCHIVED', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: '2026-11-01T00:00:00.000Z' });
      await expect(service.create(ana, 't1', { minutes: 10 })).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('update', () => {
    it('o autor muda os minutos: mantém o fim e recalcula o início', async () => {
      await service.update(ana, 'e1', { minutes: 45 });
      expect(repo.update).toHaveBeenCalledWith(W, 'e1', {
        minutes: 45,
        startedAt: new Date('2026-11-24T13:45:00.000Z'),
      });
    });

    it('aumentar os minutos de um lançamento que acabou de terminar funciona', async () => {
      repo.findById.mockResolvedValue(
        row({ startedAt: new Date('2026-11-24T14:40:00.000Z'), endedAt: NOW, minutes: 20 }),
      );
      await expect(service.update(ana, 'e1', { minutes: 25 })).resolves.toBeDefined();
      expect(repo.update).toHaveBeenCalledWith(W, 'e1', {
        minutes: 25,
        startedAt: new Date('2026-11-24T14:35:00.000Z'),
      });
    });

    it('só a nota, inclusive apagando', async () => {
      await service.update(ana, 'e1', { note: null });
      expect(repo.update).toHaveBeenCalledWith(W, 'e1', { note: null });
    });

    it('o admin edita a entrada de outra pessoa', async () => {
      await expect(service.update(admin, 'e1', { note: 'corrigido' })).resolves.toMatchObject({ id: 'e1' });
    });

    it('outro membro → ForbiddenError', async () => {
      await expect(service.update(bia, 'e1', { note: 'x' })).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('minutos de um timer ativo → TIMER_RUNNING; a nota pode mudar', async () => {
      repo.findById.mockResolvedValue(running());
      await expect(service.update(ana, 'e1', { minutes: 10 })).rejects.toMatchObject({ code: 'TIMER_RUNNING' });
      await expect(service.update(ana, 'e1', { note: 'durante' })).resolves.toBeDefined();
    });

    it('entrada de outro workspace → NotFoundError', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service.update(ana, 'e1', { note: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('projeto arquivado → PROJECT_ARCHIVED', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: '2026-11-01T00:00:00.000Z' });
      await expect(service.update(ana, 'e1', { note: 'x' })).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    });
  });

  describe('delete', () => {
    it('o autor e o admin excluem', async () => {
      await service.delete(ana, 'e1');
      await service.delete(admin, 'e1');
      expect(repo.delete).toHaveBeenCalledTimes(2);
    });

    it('outro membro → ForbiddenError', async () => {
      await expect(service.delete(bia, 'e1')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('entrada inexistente → NotFoundError', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service.delete(ana, 'e1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('projeto arquivado → PROJECT_ARCHIVED', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: '2026-11-01T00:00:00.000Z' });
      await expect(service.delete(ana, 'e1')).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
