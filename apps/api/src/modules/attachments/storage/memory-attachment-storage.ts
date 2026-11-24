import {
  type AttachmentStorage,
  StorageFailureError,
  StorageFileNotFoundError,
} from './attachment-storage';

/** In-memory storage for tests: nothing is written to disk. */
export class MemoryAttachmentStorage implements AttachmentStorage {
  private readonly files = new Map<string, Buffer>();
  private failNextWrite = false;
  private failNextRemove = false;

  /** Makes the next `save` fail, to test that no orphan record is left. */
  failOnNextSave(): void {
    this.failNextWrite = true;
  }

  /** Makes the next `remove` fail. */
  failOnNextRemove(): void {
    this.failNextRemove = true;
  }

  has(storageKey: string): boolean {
    return this.files.has(storageKey);
  }

  keys(): string[] {
    return [...this.files.keys()];
  }

  get size(): number {
    return this.files.size;
  }

  async save(storageKey: string, content: Buffer): Promise<void> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new StorageFailureError('write', 'SIMULATED');
    }
    if (this.files.has(storageKey)) throw new StorageFailureError('write', 'EEXIST');
    this.files.set(storageKey, Buffer.from(content));
  }

  async read(storageKey: string): Promise<Buffer> {
    const content = this.files.get(storageKey);
    if (!content) throw new StorageFileNotFoundError();
    return Buffer.from(content);
  }

  async remove(storageKey: string): Promise<void> {
    if (this.failNextRemove) {
      this.failNextRemove = false;
      throw new StorageFailureError('remove', 'SIMULATED');
    }
    this.files.delete(storageKey);
  }
}
