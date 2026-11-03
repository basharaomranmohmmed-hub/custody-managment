import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { TransactionRunner } from '../../shared/transactions/transaction-runner.js';

const TRANSACTION_TIMEOUT_MS = 10_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, TransactionRunner
{
  private readonly activeTransaction =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not defined');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  db(): Prisma.TransactionClient {
    return this.activeTransaction.getStore() ?? this;
  }

  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.activeTransaction.getStore()) return work();
    return this.$transaction((tx) => this.activeTransaction.run(tx, work), {
      timeout: TRANSACTION_TIMEOUT_MS,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
