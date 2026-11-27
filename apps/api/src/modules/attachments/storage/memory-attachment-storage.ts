import {
  type AttachmentStorage,
  StorageFailureError,
  StorageFileNotFoundError,
  type StoredFileInfo,
} from './attachment-storage';

/** In-memory storage for tests: nothing is written to disk. */
export class MemoryAttachmentStorage implements AttachmentStorage {
  private readonly files = new Map<string, Buffer>();
  private readonly modifiedAt = new Map<string, Date>();
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

  /** True while a failure requested by `failOnNextRemove` has not happened yet. */
  get failsNextRemove(): boolean {
    return this.failNextRemove;
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
    this.modifiedAt.set(storageKey, new Date());
  }

  /** Changes the modification date of a stored file, to test the orphan cleanup. */
  setModifiedAt(storageKey: string, date: Date): void {
    if (this.files.has(storageKey)) this.modifiedAt.set(storageKey, date);
  }

  async list(): Promise<StoredFileInfo[]> {
    return [...this.files.keys()].map((storageKey) => ({
      storageKey,
      modifiedAt: this.modifiedAt.get(storageKey) ?? new Date(),
    }));
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
    this.modifiedAt.delete(storageKey);
  }
}
