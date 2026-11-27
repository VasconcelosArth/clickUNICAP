import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageFailureError, StorageFileNotFoundError, generateStorageKey } from './attachment-storage';
import { DiskAttachmentStorage } from './disk-attachment-storage';

describe('DiskAttachmentStorage', () => {
  let root: string;
  let storage: DiskAttachmentStorage;

  beforeEach(async () => {
    // Temporary directory outside the repository, removed after each test.
    root = await mkdtemp(join(tmpdir(), 'clickunicap-attachments-'));
    storage = new DiskAttachmentStorage(join(root, 'uploads'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('saves, reads and removes a file', async () => {
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('hello'));
    expect((await storage.read(key)).toString()).toBe('hello');

    await storage.remove(key);
    await expect(storage.read(key)).rejects.toBeInstanceOf(StorageFileNotFoundError);
  });

  it('creates the storage directory when it does not exist yet', async () => {
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('x'));
    expect(await readdir(join(root, 'uploads'))).toEqual([key]);
  });

  it('removing a missing file is not an error', async () => {
    await expect(storage.remove(generateStorageKey())).resolves.toBeUndefined();
  });

  it('does not overwrite an existing key and keeps the original content', async () => {
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('original'));
    await expect(storage.save(key, Buffer.from('other'))).rejects.toBeInstanceOf(StorageFailureError);
    expect((await storage.read(key)).toString()).toBe('original');
  });

  it.each(['../escape', '../../etc/passwd', '..\\escape', '/etc/passwd', 'not-a-uuid', '', 'a/b'])(
    'rejects the unsafe key %p for every operation',
    async (key) => {
      await expect(storage.save(key, Buffer.from('x'))).rejects.toBeInstanceOf(StorageFailureError);
      await expect(storage.read(key)).rejects.toBeInstanceOf(StorageFailureError);
      await expect(storage.remove(key)).rejects.toBeInstanceOf(StorageFailureError);
    },
  );

  it('never writes outside the storage directory', async () => {
    await storage.save('../escape', Buffer.from('x')).catch(() => undefined);
    await writeFile(join(root, 'sentinel'), 'x');
    expect((await readdir(root)).sort()).toEqual(['sentinel']);
  });

  it('error messages do not expose file system paths', async () => {
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('x'));
    const error = await storage.save(key, Buffer.from('y')).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageFailureError);
    expect((error as Error).message).not.toContain(root);
  });
  it('lists only stored files with valid keys, with their modification date', async () => {
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('x'));
    await writeFile(join(root, 'uploads', 'notes.txt'), 'not an attachment');

    const files = await storage.list();
    expect(files.map((file) => file.storageKey)).toEqual([key]);
    expect(Number.isNaN(files[0]?.modifiedAt.getTime())).toBe(false); // fs dates come from another realm in Jest
  });

  it('lists nothing when the storage directory does not exist yet', async () => {
    await expect(storage.list()).resolves.toEqual([]);
  });
});
