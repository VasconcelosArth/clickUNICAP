import { Test } from '@nestjs/testing';
import { NotFoundError } from '@/core/errors';
import { TasksService } from '@/modules/tasks/tasks.service';
import { UsersService } from '@/modules/users/users.service';
import type { NotificationRow } from './notifications.repository';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

const now = new Date('2026-11-04T12:00:00Z');
const inbox = { userId: 'u-ana', workspaceId: 'w1' };
const task = { id: 't1', projectId: 'p1', title: 'Montar a vitrine' };

function row(id: string, over: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id,
    userId: inbox.userId,
    workspaceId: inbox.workspaceId,
    type: 'task_assigned',
    refId: task.id,
    payload: { taskId: task.id, taskTitle: task.title, projectId: task.projectId, actorId: null, actorName: null },
    readAt: null,
    createdAt: now,
    ...over,
  };
}

describe('NotificationsService', () => {
  const repo = {
    insert: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };
  const tasks = { findOne: jest.fn() };
  const users = { getProfile: jest.fn() };
  let service: NotificationsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    tasks.findOne.mockResolvedValue(task);
    users.getProfile.mockResolvedValue({ id: 'u-bruno', name: 'Bruno' });
    repo.insert.mockImplementation(async (data: Partial<NotificationRow>) => row('n1', data));
    const mod = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repo },
        { provide: TasksService, useValue: tasks },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = mod.get(NotificationsService);
  });

  describe('notify', () => {
    const assigned = {
      type: 'task_assigned' as const,
      userId: 'u-ana',
      workspaceId: 'w1',
      taskId: 't1',
      actorId: 'u-bruno',
    };

    it('guarda o título da tarefa e o nome de quem causou', async () => {
      const created = await service.notify(assigned);
      expect(repo.insert).toHaveBeenCalledWith({
        userId: 'u-ana',
        workspaceId: 'w1',
        type: 'task_assigned',
        refId: 't1',
        payload: {
          taskId: 't1',
          taskTitle: 'Montar a vitrine',
          projectId: 'p1',
          actorId: 'u-bruno',
          actorName: 'Bruno',
        },
      });
      expect(created).toMatchObject({ id: 'n1', type: 'task_assigned', readAt: null, createdAt: now.toISOString() });
    });

    it('não notifica quem agiu sobre si mesmo', async () => {
      await expect(service.notify({ ...assigned, actorId: 'u-ana' })).resolves.toBeNull();
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('ignora tarefa que não existe mais no workspace', async () => {
      tasks.findOne.mockResolvedValueOnce(null);
      await expect(service.notify(assigned)).resolves.toBeNull();
      expect(tasks.findOne).toHaveBeenCalledWith('w1', 't1');
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menção: aponta para o comentário', async () => {
      await service.notify({ ...assigned, type: 'comment_mentioned', commentId: 'c1' });
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'comment_mentioned',
          refId: 'c1',
          payload: expect.objectContaining({ taskId: 't1', commentId: 'c1' }),
        }),
      );
    });

    it('prazo chegando: aviso automático, sem autor', async () => {
      await service.notify({ type: 'task_due_soon', userId: 'u-ana', workspaceId: 'w1', taskId: 't1' });
      expect(users.getProfile).not.toHaveBeenCalled();
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ actorId: null, actorName: null }) }),
      );
    });
  });

  describe('list', () => {
    it('devolve a página e o cursor quando há mais', async () => {
      repo.list.mockResolvedValue([row('n3'), row('n2'), row('n1')]);
      const page = await service.list(inbox, { unread: false, limit: 2 });
      expect(page.data.map((n) => n.id)).toEqual(['n3', 'n2']);
      expect(page.nextCursor).toBe('n2');
      expect(repo.list).toHaveBeenCalledWith(inbox, { unread: false, limit: 2, cursor: undefined });
    });

    it('última página: nextCursor null', async () => {
      repo.list.mockResolvedValue([row('n1')]);
      await expect(service.list(inbox, { unread: true, limit: 2 })).resolves.toMatchObject({ nextCursor: null });
    });

    it('continua a partir do cursor', async () => {
      const cursor = row('n2');
      repo.findById.mockResolvedValue(cursor);
      repo.list.mockResolvedValue([row('n1')]);
      await service.list(inbox, { unread: false, limit: 2, cursor: 'n2' });
      expect(repo.findById).toHaveBeenCalledWith(inbox, 'n2');
      expect(repo.list).toHaveBeenCalledWith(inbox, { unread: false, limit: 2, cursor });
    });

    it('cursor de outra caixa de entrada → NotFoundError', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service.list(inbox, { unread: false, limit: 2, cursor: 'x' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.list).not.toHaveBeenCalled();
    });
  });

  it('unreadCount devolve o total de não lidas', async () => {
    repo.countUnread.mockResolvedValue(3);
    await expect(service.unreadCount(inbox)).resolves.toEqual({ count: 3 });
  });

  describe('markRead', () => {
    it('devolve a notificação lida', async () => {
      repo.markRead.mockResolvedValue(row('n1', { readAt: now }));
      await expect(service.markRead(inbox, 'n1')).resolves.toMatchObject({ id: 'n1', readAt: now.toISOString() });
    });

    it('de outro usuário ou workspace → NotFoundError', async () => {
      repo.markRead.mockResolvedValue(undefined);
      await expect(service.markRead(inbox, 'n1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
