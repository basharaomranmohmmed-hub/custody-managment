import { Inject, Injectable, Logger } from '@nestjs/common';
import { toErrorResponse } from '../../../shared/filters/http-exception.filter.js';
import { currentRequestContext } from '../../../shared/request-context/request-context.js';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/transactions/transaction-runner.js';
import {
  type AuditAction,
  type AuditEntityType,
  AUDIT_LOGS_REPOSITORY,
  type AuditLogsRepository,
  type AuditValues,
} from '../domain/audit-logs.types.js';

export const REDACTED = '[REDACTED]';

const SECRET_FIELD = /pass(word)?|secret|token|api[-_]?key|credential/i;

const PERSONAL_FIELDS: Partial<Record<AuditEntityType, readonly string[]>> = {
  EMPLOYEE: ['phone', 'email'],
  USER: ['phone', 'email'],
};

export interface AuditTarget {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
}

export interface AuditedChange {
  entityId: number;
  before?: object;
  after: object;
}

export interface AuditedResult<T> {
  result: T;
  change: AuditedChange | null;
}

@Injectable()
export class AuditTrail {
  private readonly logger = new Logger(AuditTrail.name);

  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(AUDIT_LOGS_REPOSITORY)
    private readonly auditLogsRepository: AuditLogsRepository,
  ) {}

  async run<T>(
    target: AuditTarget,
    work: (target: AuditTarget) => Promise<AuditedResult<T>>,
  ): Promise<T> {
    const current: AuditTarget = { ...target };
    try {
      return await this.transactions.runInTransaction(async () => {
        const { result, change } = await work(current);
        if (change) await this.recordSuccess(current, change);
        return result;
      });
    } catch (error) {
      await this.recordFailure(current, error);
      throw error;
    }
  }

  private async recordSuccess(
    target: AuditTarget,
    { entityId, before, after }: AuditedChange,
  ) {
    const values = before
      ? this.changedValues(target.entityType, before, after)
      : {
          old_values: null,
          new_values: this.mask(target.entityType, snapshot(after)),
        };
    if (!values) return;

    await this.auditLogsRepository.create({
      user_id: currentUserId(),
      action: target.action,
      entity_type: target.entityType,
      entity_id: entityId,
      ...values,
      outcome: 'SUCCESS',
      error_code: null,
      ip_address: currentIpAddress(),
    });
  }

  private async recordFailure(target: AuditTarget, error: unknown) {
    try {
      await this.auditLogsRepository.create({
        user_id: currentUserId(),
        action: target.action,
        entity_type: target.entityType,
        entity_id: target.entityId ?? null,
        old_values: null,
        new_values: null,
        outcome: 'FAILURE',
        error_code: toErrorResponse(error).errorCode,
        ip_address: currentIpAddress(),
      });
    } catch (auditError) {
      this.logger.error(
        `Could not record the failed ${target.action} of ${target.entityType}`,
        auditError instanceof Error ? auditError.stack : String(auditError),
      );
    }
  }

  private changedValues(
    entityType: AuditEntityType,
    before: object,
    after: object,
  ) {
    const previous = snapshot(before);
    const next = snapshot(after);
    const changedKeys = [
      ...new Set([...Object.keys(previous), ...Object.keys(next)]),
    ].filter((key) => previous[key] !== next[key]);
    if (changedKeys.length === 0) return null;

    return {
      old_values: this.mask(entityType, pick(previous, changedKeys)),
      new_values: this.mask(entityType, pick(next, changedKeys)),
    };
  }

  private mask(entityType: AuditEntityType, values: AuditValues): AuditValues {
    const personalFields = PERSONAL_FIELDS[entityType] ?? [];
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value !== null &&
        (personalFields.includes(key) || SECRET_FIELD.test(key))
          ? REDACTED
          : value,
      ]),
    );
  }
}

function snapshot(entity: object): AuditValues {
  const values: AuditValues = {};
  for (const [key, value] of Object.entries(entity)) {
    if (key === 'id') continue;
    if (value instanceof Date) {
      values[key] = value.toISOString();
    } else if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      values[key] = value;
    }
  }
  return values;
}

function pick(values: AuditValues, keys: string[]): AuditValues {
  return Object.fromEntries(keys.map((key) => [key, values[key] ?? null]));
}

function currentIpAddress(): string | null {
  return currentRequestContext()?.ipAddress ?? null;
}

function currentUserId(): number | null {
  return currentRequestContext()?.userId ?? null;
}
