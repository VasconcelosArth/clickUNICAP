import { Test } from '@nestjs/testing';
import { ConflictError, DomainError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { DependenciesRepository } from './dependencies.repository';
import { DependenciesService } from './dependencies.service';
import type { DependencyEdge } from './utils/cycle';

const now = new Date('2026-11-04T12:00:00Z');
const W = 'w1';
const task = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  projectId: 'p1',
  title: `Tarefa ${id}`,
  ...over,
});

describe('DependenciesService', () => {
  const repo = {
    listBlockedBy: jest.fn(),
    listBlocking: jest.fn(),
    listByProject: jest.fn(),
    find: jest.fn(),
    insertUnlessCycle: jest.fn(),
    delete: jest.fn(),
  };
  const tasks = { findOne: jest.fn() };
  const projects = { get: jest.fn() };
  let service: DependenciesService;

  /** Simula a transação do repository: roda a regra de ciclo do service sobre o grafo informado. */
  function graph(current: DependencyEdge[]) {
    repo.insertUnlessCycle.mockImplementation(
      async (_w: string, _p: string, edge: DependencyEdge, isCycle: (c: DependencyEdge[]) => boolean) =>
        isCycle(current) ? { rejected: 'cycle' } : { created: { ...edge, createdAt: now } },
    );
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    tasks.findOne.mockImplementation(async (_w: string, id: string) => task(id));
    projects.get.mockResolvedValue({ id: 'p1', archivedAt: null });
    graph([]);
    const mod = await Test.createTestingModule({
      providers: [
        DependenciesService,
        { provide: DependenciesRepository, useValue: repo },
        { provide: TasksService, useValue: tasks },
        { provide: ProjectsService, useValue: projects },
      ],
    }).compile();
    service = mod.get(DependenciesService);
  });

  describe('create', () => {
    it('grava a dependência e devolve o DTO com a data em ISO', async () => {
      await expect(service.create(W, 'a', { dependsOnTaskId: 'b' })).resolves.toEqual({
        taskId: 'a',
        dependsOnTaskId: 'b',
        createdAt: now.toISOString(),
      });
      expect(repo.insertUnlessCycle).toHaveBeenCalledWith(
        W,
        'p1',
        { taskId: 'a', dependsOnTaskId: 'b' },
        expect.any(Function),
      );
    });

    it('tarefa inexistente no workspace → NotFoundError', async () => {
      tasks.findOne.mockResolvedValueOnce(null);
      await expect(service.create(W, 'a', { dependsOnTaskId: 'b' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.insertUnlessCycle).not.toHaveBeenCalled();
    });

    it('tarefa bloqueadora inexistente no workspace → NotFoundError', async () => {
      tasks.findOne.mockResolvedValueOnce(task('a')).mockResolvedValueOnce(null);
      await expect(service.create(W, 'a', { dependsOnTaskId: 'b' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('depender de si mesma → SELF_DEPENDENCY', async () => {
      await expect(service.create(W, 'a', { dependsOnTaskId: 'a' })).rejects.toMatchObject({
        code: 'SELF_DEPENDENCY',
        statusCode: 400,
      });
    });

    it('tarefas de projetos diferentes → DEPENDENCY_OTHER_PROJECT', async () => {
      tasks.findOne.mockImplementation(async (_w: string, id: string) =>
        task(id, { projectId: id === 'b' ? 'p2' : 'p1' }),
      );
      await expect(service.create(W, 'a', { dependsOnTaskId: 'b' })).rejects.toMatchObject({
        code: 'DEPENDENCY_OTHER_PROJECT',
      });
    });

    it('projeto arquivado → PROJECT_ARCHIVED (409)', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
      const error = await service.create(W, 'a', { dependsOnTaskId: 'b' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.insertUnlessCycle).not.toHaveBeenCalled();
    });

    it('fechar um ciclo → CIRCULAR_DEPENDENCY, com o nome das tarefas na mensagem', async () => {
      // b já espera por c, e c espera por a: "a espera b" fecharia a ← b ← c ← a
      graph([
        { taskId: 'b', dependsOnTaskId: 'c' },
        { taskId: 'c', dependsOnTaskId: 'a' },
      ]);
      const error = await service.create(W, 'a', { dependsOnTaskId: 'b' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({ code: 'CIRCULAR_DEPENDENCY', statusCode: 400 });
      expect((error as Error).message).toContain('Tarefa b');
    });

    it('dependência repetida → DEPENDENCY_EXISTS (409)', async () => {
      repo.insertUnlessCycle.mockResolvedValue({ rejected: 'exists' });
      await expect(service.create(W, 'a', { dependsOnTaskId: 'b' })).rejects.toMatchObject({
        code: 'DEPENDENCY_EXISTS',
        statusCode: 409,
      });
    });
  });

  describe('listForTask', () => {
    it('devolve as duas direções', async () => {
      const summary = { id: 'b', title: 'B', status: 'todo', startDate: null, dueDate: null };
      repo.listBlockedBy.mockResolvedValue([summary]);
      repo.listBlocking.mockResolvedValue([]);
      await expect(service.listForTask(W, 'a')).resolves.toEqual({ blockedBy: [summary], blocking: [] });
      expect(repo.listBlockedBy).toHaveBeenCalledWith(W, 'a');
      expect(repo.listBlocking).toHaveBeenCalledWith(W, 'a');
    });

    it('tarefa de outro workspace → NotFoundError', async () => {
      tasks.findOne.mockResolvedValue(null);
      await expect(service.listForTask(W, 'a')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.listBlockedBy).not.toHaveBeenCalled();
    });
  });

  describe('listForProject', () => {
    it('confere o projeto no workspace antes de listar', async () => {
      repo.listByProject.mockResolvedValue([{ taskId: 'a', dependsOnTaskId: 'b', createdAt: now }]);
      await expect(service.listForProject(W, 'p1')).resolves.toEqual([
        { taskId: 'a', dependsOnTaskId: 'b', createdAt: now.toISOString() },
      ]);
      expect(projects.get).toHaveBeenCalledWith(W, 'p1');
    });

    it('projeto de outro workspace → o NotFoundError do ProjectsService passa adiante', async () => {
      projects.get.mockRejectedValue(new NotFoundError('Projeto', 'p1'));
      await expect(service.listForProject(W, 'p1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.listByProject).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('apaga a dependência', async () => {
      repo.delete.mockResolvedValue(true);
      await expect(service.delete(W, 'a', 'b')).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(W, 'a', 'b');
    });

    it('dependência inexistente → NotFoundError', async () => {
      repo.delete.mockResolvedValue(false);
      await expect(service.delete(W, 'a', 'b')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('projeto arquivado → PROJECT_ARCHIVED', async () => {
      projects.get.mockResolvedValue({ id: 'p1', archivedAt: now.toISOString() });
      await expect(service.delete(W, 'a', 'b')).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
