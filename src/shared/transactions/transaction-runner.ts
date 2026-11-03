export interface TransactionRunner {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');
