import type { Readable } from 'node:stream';

export interface StoredFile {
  stream: Readable;
  sizeBytes: number;
}

export interface DocumentStorage {
  save(content: Uint8Array): Promise<string>;
  open(storageKey: string): Promise<StoredFile | null>;
  remove(storageKey: string): Promise<void>;
}

export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');
