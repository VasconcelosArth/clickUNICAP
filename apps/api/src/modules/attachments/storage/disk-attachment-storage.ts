import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import {
  type AttachmentStorage,
  StorageFailureError,
  StorageFileNotFoundError,
  isValidStorageKey,
} from './attachment-storage';

/** Stores each attachment as one file named after its server-generated key. */
export class DiskAttachmentStorage implements AttachmentStorage {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  async save(storageKey: string, content: Buffer): Promise<void> {
    const filePath = this.pathFor(storageKey, 'write');
    try {
      await mkdir(this.rootDir, { recursive: true });
      await writeFile(filePath, content, { flag: 'wx' }); // never overwrite
    } catch (error) {
      const code = errorCode(error);
      if (code !== 'EEXIST') {
        // No partial file left behind (but never touch a file that already existed).
        await rm(filePath, { force: true }).catch(() => undefined);
      }
      throw new StorageFailureError('write', code);
    }
  }

  async read(storageKey: string): Promise<Buffer> {
    const filePath = this.pathFor(storageKey, 'read');
    try {
      return await readFile(filePath);
    } catch (error) {
      if (errorCode(error) === 'ENOENT') throw new StorageFileNotFoundError();
      throw new StorageFailureError('read', errorCode(error));
    }
  }

  async remove(storageKey: string): Promise<void> {
    const filePath = this.pathFor(storageKey, 'remove');
    try {
      await rm(filePath, { force: true });
    } catch (error) {
      throw new StorageFailureError('remove', errorCode(error));
    }
  }

  /** Only server-generated UUID keys are accepted, so the path cannot escape `rootDir`. */
  private pathFor(storageKey: string, operation: 'write' | 'read' | 'remove'): string {
    if (!isValidStorageKey(storageKey)) throw new StorageFailureError(operation, 'INVALID_KEY');
    const filePath = resolve(this.rootDir, storageKey);
    if (!filePath.startsWith(this.rootDir + sep)) throw new StorageFailureError(operation, 'INVALID_KEY');
    return filePath;
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
