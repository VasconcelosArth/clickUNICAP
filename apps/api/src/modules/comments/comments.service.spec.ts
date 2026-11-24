import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenError, NotFoundError } from '@/core/errors';
import { DomainEvents } from '@/core/events';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { CommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';
import { randomUUID } from 'node:crypto';

const U1 = randomUUID();
const U2 = randomUUID();

describe('CommentsService', () => {
  let service: CommentsService;
  const repo = {
    findTaskScope: jest.fn(),
    listByTask: jest.fn(),
    findById: jest.fn(),
    listMentionedUserIds: jest.fn(),
    createWithMentions: jest.fn(),
    updateWithMentions: jest.fn(),
    remove: jest.fn(),
  };
  const workspaces = { isMember: jest.fn() };
  const events = { emit: jest.fn() };
  const ctx = { userId: 'u1', workspaceId: 'w1' };

  beforeEach(async () => {
    jest.resetAllMocks();
    workspaces.isMember.mockResolvedValue(true);
    const mod = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: repo },
        { provide: WorkspacesService, useValue: workspaces },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = mod.get(CommentsService);
  });

  describe('list', () => {
    it('lista os comentários da tarefa', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.listByTask.mockResolvedValue([{ id: 'c1' }]);
      await expect(service.list('w1', 't1')).resolves.toEqual([{ id: 'c1' }]);
    });

    it('NotFoundError quando a tarefa é de outro workspace', async () => {
      repo.findTaskScope.mockResolvedValue(null);
      await expect(service.list('w1', 't1')).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.listByTask).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('cria o comentário sem menções', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.createWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      await service.create(ctx, 't1', { body: 'oi' });
      expect(repo.createWithMentions).toHaveBeenCalledWith({ taskId: 't1', authorId: 'u1', body: 'oi' }, []);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('NotFoundError quando a tarefa é de outro workspace', async () => {
      repo.findTaskScope.mockResolvedValue(null);
      await expect(service.create(ctx, 't1', { body: 'oi' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.createWithMentions).not.toHaveBeenCalled();
    });

    it('emite um evento por pessoa mencionada que é membro', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.createWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      await service.create(ctx, 't1', { body: `oi @[${U1}] e @[${U2}]` });
      expect(events.emit).toHaveBeenCalledTimes(2);
      expect(events.emit).toHaveBeenCalledWith(DomainEvents.CommentMentioned, {
        commentId: 'c1',
        taskId: 't1',
        mentionedUserId: U1,
        by: 'u1',
        workspaceId: 'w1',
      });
    });

    it('ignora menção de quem não é membro do workspace', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.createWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      workspaces.isMember.mockImplementation(async (_w: string, userId: string) => userId === U1);
      await service.create(ctx, 't1', { body: `@[${U1}] @[${U2}]` });
      expect(repo.createWithMentions).toHaveBeenCalledWith(expect.anything(), [U1]);
      expect(events.emit).toHaveBeenCalledTimes(1);
    });

    it('não emite evento quando o autor menciona a si mesmo', async () => {
      repo.findTaskScope.mockResolvedValue({ taskId: 't1', archived: false });
      repo.createWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      const selfCtx = { userId: U1, workspaceId: 'w1' };
      await service.create(selfCtx, 't1', { body: `@[${U1}] @[${U2}]` });
      expect(events.emit).toHaveBeenCalledTimes(1);
      expect(events.emit).toHaveBeenCalledWith(
        DomainEvents.CommentMentioned,
        expect.objectContaining({ mentionedUserId: U2, workspaceId: 'w1', by: U1 }),
      );
    });
  });

  describe('update', () => {
    const existing = { comment: { id: 'c1', taskId: 't1', authorId: 'u1' }, archived: false };

    it('autor edita o comentário', async () => {
      repo.findById.mockResolvedValue(existing);
      repo.listMentionedUserIds.mockResolvedValue([]);
      repo.updateWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      await expect(service.update(ctx, 'c1', { body: 'novo' })).resolves.toMatchObject({ id: 'c1' });
      expect(repo.updateWithMentions).toHaveBeenCalledWith('c1', 'novo', []);
    });

    it('NotFoundError quando não existe no workspace', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ctx, 'c1', { body: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('ForbiddenError quando não é o autor', async () => {
      repo.findById.mockResolvedValue({ ...existing, comment: { ...existing.comment, authorId: 'outro' } });
      await expect(service.update(ctx, 'c1', { body: 'x' })).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.updateWithMentions).not.toHaveBeenCalled();
    });

    it('emite evento só para menções novas', async () => {
      repo.findById.mockResolvedValue(existing);
      repo.listMentionedUserIds.mockResolvedValue([U1]);
      repo.updateWithMentions.mockResolvedValue({ id: 'c1', taskId: 't1' });
      await service.update(ctx, 'c1', { body: `@[${U1}] @[${U2}]` });
      expect(events.emit).toHaveBeenCalledTimes(1);
      expect(events.emit).toHaveBeenCalledWith(
        DomainEvents.CommentMentioned,
        expect.objectContaining({ mentionedUserId: U2, workspaceId: 'w1', by: 'u1' }),
      );
    });
  });

  describe('remove', () => {
    const existing = { comment: { id: 'c1', taskId: 't1', authorId: 'u1' }, archived: false };

    it('autor apaga o comentário', async () => {
      repo.findById.mockResolvedValue(existing);
      await service.remove(ctx, 'c1');
      expect(repo.remove).toHaveBeenCalledWith('c1');
    });

    it('NotFoundError quando não existe no workspace', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(ctx, 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('ForbiddenError quando não é o autor', async () => {
      repo.findById.mockResolvedValue({ ...existing, comment: { ...existing.comment, authorId: 'outro' } });
      await expect(service.remove(ctx, 'c1')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
