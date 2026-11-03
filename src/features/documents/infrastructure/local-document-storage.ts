import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type {
  DocumentStorage,
  StoredFile,
} from '../domain/document-storage.js';

export const DEFAULT_DOCUMENTS_STORAGE_DIR = 'storage/documents';

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class LocalDocumentStorage implements DocumentStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async save(content: Uint8Array): Promise<string> {
    await mkdir(this.root, { recursive: true });
    const storageKey = randomUUID();
    const target = this.pathOf(storageKey);
    const partial = `${target}.part`;

    try {
      const handle = await open(partial, 'wx', 0o600);
      try {
        await handle.writeFile(content);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(partial, target);
    } catch (error) {
      await rm(partial, { force: true });
      throw error;
    }
    return storageKey;
  }

  async open(storageKey: string): Promise<StoredFile | null> {
    const path = this.pathOf(storageKey);
    let handle;
    try {
      handle = await open(path, 'r');
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }

    try {
      const { size } = await handle.stat();
      return { stream: handle.createReadStream(), sizeBytes: size };
    } catch (error) {
      await handle.close();
      throw error;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.pathOf(storageKey), { force: true });
  }

  private pathOf(storageKey: string): string {
    const path = join(this.root, storageKey);
    if (
      !STORAGE_KEY_PATTERN.test(storageKey) ||
      !path.startsWith(this.root + sep)
    ) {
      throw new Error('Invalid document storage key');
    }
    return path;
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}
