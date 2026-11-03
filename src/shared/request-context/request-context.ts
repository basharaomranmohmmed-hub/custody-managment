import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  ipAddress: string | null;
  userId: number | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, work: () => T): T {
  return storage.run(context, work);
}

export function currentRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}
