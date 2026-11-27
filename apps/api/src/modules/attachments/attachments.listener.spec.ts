import { Logger } from '@nestjs/common';
import { AttachmentsListener } from './attachments.listener';
import type { AttachmentsService } from './attachments.service';

describe('AttachmentsListener', () => {
  const service = {
    storageKeysOfTask: jest.fn(),
    storageKeysOfWorkspace: jest.fn(),
    removeStoredFiles: jest.fn(),
  };
  let listener: AttachmentsListener;

  beforeEach(() => {
    jest.resetAllMocks();
    service.removeStoredFiles.mockResolvedValue(undefined);
    listener = new AttachmentsListener(service as unknown as AttachmentsService);
  });

  const taskPayload = () => ({ taskId: 't1', projectId: 'p1', workspaceId: 'w1' });

  it('task: reads the keys before the delete and removes the files only after it', async () => {
    service.storageKeysOfTask.mockResolvedValue(['k1', 'k2']);
    const payload = taskPayload();

    await listener.onTaskDeleting(payload);
    expect(service.storageKeysOfTask).toHaveBeenCalledWith('w1', 't1');
    expect(service.removeStoredFiles).not.toHaveBeenCalled();

    await listener.onTaskDeleted(payload);
    expect(service.removeStoredFiles).toHaveBeenCalledWith(['k1', 'k2']);
  });

  it('workspace: removes every file of the workspace after the delete', async () => {
    service.storageKeysOfWorkspace.mockResolvedValue(['k1']);
    const payload = { workspaceId: 'w1', by: 'u1' };

    await listener.onWorkspaceDeleting(payload);
    await listener.onWorkspaceDeleted(payload);

    expect(service.storageKeysOfWorkspace).toHaveBeenCalledWith('w1');
    expect(service.removeStoredFiles).toHaveBeenCalledWith(['k1']);
  });

  it('removes nothing when the delete did not happen (only the "deleting" phase ran)', async () => {
    service.storageKeysOfTask.mockResolvedValue(['k1']);
    await listener.onTaskDeleting(taskPayload());
    // Another deletion of the same task arrives with a different payload object
    await listener.onTaskDeleted(taskPayload());
    expect(service.removeStoredFiles).not.toHaveBeenCalled();
  });

  it('does not remove the same files twice', async () => {
    service.storageKeysOfTask.mockResolvedValue(['k1']);
    const payload = taskPayload();
    await listener.onTaskDeleting(payload);
    await listener.onTaskDeleted(payload);
    await listener.onTaskDeleted(payload);
    expect(service.removeStoredFiles).toHaveBeenCalledTimes(1);
  });

  it('a task without attachments touches nothing', async () => {
    service.storageKeysOfTask.mockResolvedValue([]);
    const payload = taskPayload();
    await listener.onTaskDeleting(payload);
    await listener.onTaskDeleted(payload);
    expect(service.removeStoredFiles).not.toHaveBeenCalled();
  });

  it('a failure only goes to the log and never reaches who deleted', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service.storageKeysOfTask.mockRejectedValue(new Error('db down'));
    await expect(listener.onTaskDeleting(taskPayload())).resolves.toBeUndefined();

    service.storageKeysOfWorkspace.mockResolvedValue(['k1']);
    service.removeStoredFiles.mockRejectedValue(new Error('disk down'));
    const payload = { workspaceId: 'w1', by: 'u1' };
    await listener.onWorkspaceDeleting(payload);
    await expect(listener.onWorkspaceDeleted(payload)).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
