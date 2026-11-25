import { Logger } from '@nestjs/common';
import { NotificationsListener } from './notifications.listener';
import type { NotificationsService } from './notifications.service';

describe('NotificationsListener', () => {
  const service = { notify: jest.fn() };
  const listener = new NotificationsListener(service as unknown as NotificationsService);

  beforeEach(() => {
    jest.resetAllMocks();
    service.notify.mockResolvedValue(null);
  });

  it('task.assigned → avisa o responsável', async () => {
    await listener.onTaskAssigned({ taskId: 't1', assigneeId: 'u2', by: 'u1', workspaceId: 'w1' });
    expect(service.notify).toHaveBeenCalledWith({
      type: 'task_assigned',
      userId: 'u2',
      workspaceId: 'w1',
      taskId: 't1',
      actorId: 'u1',
    });
  });

  it('comment.mentioned → avisa quem foi mencionado', async () => {
    await listener.onCommentMentioned({
      commentId: 'c1',
      taskId: 't1',
      mentionedUserId: 'u2',
      by: 'u1',
      workspaceId: 'w1',
    });
    expect(service.notify).toHaveBeenCalledWith({
      type: 'comment_mentioned',
      userId: 'u2',
      workspaceId: 'w1',
      taskId: 't1',
      actorId: 'u1',
      commentId: 'c1',
    });
  });

  it('task.due_soon → avisa o responsável, sem autor', async () => {
    await listener.onTaskDueSoon({ taskId: 't1', assigneeId: 'u2', workspaceId: 'w1' });
    expect(service.notify).toHaveBeenCalledWith({
      type: 'task_due_soon',
      userId: 'u2',
      workspaceId: 'w1',
      taskId: 't1',
    });
  });

  it('uma falha vai para o log e não chega a quem emitiu o evento', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service.notify.mockRejectedValue(new Error('banco fora do ar'));
    await expect(
      listener.onTaskAssigned({ taskId: 't1', assigneeId: 'u2', by: 'u1', workspaceId: 'w1' }),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
