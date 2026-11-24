import { StorageFailureError, StorageFileNotFoundError, generateStorageKey } from './attachment-storage';
import { MemoryAttachmentStorage } from './memory-attachment-storage';

describe('MemoryAttachmentStorage', () => {
  it('saves, reads and removes', async () => {
    const storage = new MemoryAttachmentStorage();
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('hello'));
    expect(storage.has(key)).toBe(true);
    expect((await storage.read(key)).toString()).toBe('hello');

    await storage.remove(key);
    expect(storage.size).toBe(0);
    await expect(storage.read(key)).rejects.toBeInstanceOf(StorageFileNotFoundError);
  });

  it('fails only the next save when asked to, leaving nothing stored', async () => {
    const storage = new MemoryAttachmentStorage();
    storage.failOnNextSave();
    await expect(storage.save(generateStorageKey(), Buffer.from('x'))).rejects.toBeInstanceOf(StorageFailureError);
    expect(storage.size).toBe(0);

    await storage.save(generateStorageKey(), Buffer.from('x'));
    expect(storage.size).toBe(1);
  });

  it('fails only the next remove when asked to, keeping the file', async () => {
    const storage = new MemoryAttachmentStorage();
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('x'));
    storage.failOnNextRemove();
    await expect(storage.remove(key)).rejects.toBeInstanceOf(StorageFailureError);
    expect(storage.has(key)).toBe(true);
  });

  it('does not allow overwriting a key', async () => {
    const storage = new MemoryAttachmentStorage();
    const key = generateStorageKey();
    await storage.save(key, Buffer.from('a'));
    await expect(storage.save(key, Buffer.from('b'))).rejects.toBeInstanceOf(StorageFailureError);
  });
});
