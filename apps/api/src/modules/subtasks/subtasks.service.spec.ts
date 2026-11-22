import { Test } from '@nestjs/testing';
import { ConflictError, NotFoundError } from '@/core/errors';
import { SubtasksRepository } from './subtasks.repository';
import { SubtasksService } from './subtasks.service';

describe('SubtasksService', () => {
  let service: SubtasksService;
  const repo = {
    findTaskScope: jest.fn(),
    listByTask: jest.fn(),
    findById: jest.fn(),
    insertAtEnd: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [SubtasksService, { provide: SubtasksRepository, useValue: repo }],
    }).compile();
    service = mod.get(SubtasksService);
  });

  describe('list', () => {
    it('lista as subtarefas da tarefa', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.listByTask.mockResolvedValue([{ id: 's1' }]);
      await expect(service.list('w1', 't1')).resolves.toEqual([{ id: 's1' }]);
    });

    it('NotFoundError quando a tarefa é de outro workspace', async () => {
      repo.findTaskScope.mockResolvedValue(null);
      await expect(service.list('w1', 't1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.listByTask).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('cria no fim da lista', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.insertAtEnd.mockResolvedValue({ id: 's1', title: 'Item' });
      await expect(service.create('w1', 't1', { title: 'Item' })).resolves.toMatchObject({ id: 's1' });
      expect(repo.insertAtEnd).toHaveBeenCalledWith('t1', 'Item');
    });

    it('NotFoundError quando a tarefa é de outro workspace', async () => {
      repo.findTaskScope.mockResolvedValue(null);
      await expect(service.create('w1', 't1', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.insertAtEnd).not.toHaveBeenCalled();
    });

    it('ConflictError quando o projeto está arquivado', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: true });
      await expect(service.create('w1', 't1', { title: 'x' })).rejects.toBeInstanceOf(ConflictError);
      expect(repo.insertAtEnd).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('atualiza só os campos enviados', async () => {
      repo.findById.mockResolvedValue({ subtask: { id: 's1' }, archived: false });
      repo.update.mockResolvedValue({ id: 's1', isDone: true });
      await service.update('w1', 's1', { isDone: true });
      expect(repo.update).toHaveBeenCalledWith('s1', { isDone: true });
    });

    it('NotFoundError quando não existe no workspace', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('w1', 's1', { isDone: true })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ConflictError quando o projeto está arquivado', async () => {
      repo.findById.mockResolvedValue({ subtask: { id: 's1' }, archived: true });
      await expect(service.update('w1', 's1', { isDone: true })).rejects.toBeInstanceOf(ConflictError);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('apaga a subtarefa', async () => {
      repo.findById.mockResolvedValue({ subtask: { id: 's1' }, archived: false });
      await service.remove('w1', 's1');
      expect(repo.remove).toHaveBeenCalledWith('s1');
    });

    it('NotFoundError quando não existe no workspace', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('w1', 's1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('ConflictError quando o projeto está arquivado', async () => {
      repo.findById.mockResolvedValue({ subtask: { id: 's1' }, archived: true });
      await expect(service.remove('w1', 's1')).rejects.toBeInstanceOf(ConflictError);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
