import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import type {
  AuditedEntityRef,
  AuditEntityType,
  AuditLogEntity,
  AuditLogFilters,
  AuditLogsRepository,
  AuditValues,
  CreateAuditLogData,
} from '../domain/audit-logs.types.js';

const auditLogInclude = {
  user: { select: { id: true, uuid: true, username: true } },
} satisfies Prisma.audit_logsInclude;

type AuditLogRecord = Prisma.audit_logsGetPayload<{
  include: typeof auditLogInclude;
}>;

type EntityWhere = { id?: { in: number[] }; uuid?: string };

type EntityTable = (
  db: Prisma.TransactionClient,
  where: EntityWhere,
) => Promise<AuditedEntityRef[]>;

const refSelect = { id: true, uuid: true } as const;

const ENTITY_TABLES: Record<AuditEntityType, EntityTable | null> = {
  DEPARTMENT: (db, where) =>
    db.departments.findMany({ where, select: refSelect }),
  EMPLOYEE: (db, where) => db.employees.findMany({ where, select: refSelect }),
  CUSTODY_TYPE: (db, where) =>
    db.custody_types.findMany({ where, select: refSelect }),
  ITEM: (db, where) => db.items.findMany({ where, select: refSelect }),
  POSSESSION: (db, where) =>
    db.possessions.findMany({ where, select: refSelect }),
  INCIDENT_REPORT: (db, where) =>
    db.incident_reports.findMany({ where, select: refSelect }),
  DOCUMENT: (db, where) => db.documents.findMany({ where, select: refSelect }),
  USER: (db, where) => db.users.findMany({ where, select: refSelect }),
  ROLE: null,
  PERMISSION: null,
};

@Injectable()
export class PrismaAuditLogsRepository implements AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<void> {
    await this.prisma.db().audit_logs.create({
      data: {
        ...data,
        old_values: data.old_values ?? undefined,
        new_values: data.new_values ?? undefined,
      },
    });
  }

  async findAll(
    filters: AuditLogFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ audit_logs: AuditLogEntity[]; total: number }> {
    const where: Prisma.audit_logsWhereInput = {
      user_id: filters.user_id,
      action: filters.action,
      entity_type: filters.entity_type,
      entity_id: filters.entity_id,
      outcome: filters.outcome,
      error_code: filters.error_code,
      created_at:
        filters.created_from || filters.created_to
          ? { gte: filters.created_from, lte: filters.created_to }
          : undefined,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.audit_logs.findMany({
        where,
        include: auditLogInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return { audit_logs: await this.withEntities(records), total };
  }

  async findByUuid(uuid: string): Promise<AuditLogEntity | null> {
    const record = await this.prisma.db().audit_logs.findUnique({
      where: { uuid },
      include: auditLogInclude,
    });
    if (!record) return null;

    const [auditLog] = await this.withEntities([record]);
    return auditLog;
  }

  async findEntityId(
    entityType: AuditEntityType,
    uuid: string,
  ): Promise<number | null> {
    const table = ENTITY_TABLES[entityType];
    if (!table) return null;

    const [ref] = await table(this.prisma.db(), { uuid });
    return ref?.id ?? null;
  }

  private async withEntities(
    records: AuditLogRecord[],
  ): Promise<AuditLogEntity[]> {
    const idsByType = new Map<AuditEntityType, Set<number>>();
    for (const { entity_type, entity_id } of records) {
      if (entity_id === null) continue;
      const ids = idsByType.get(entity_type) ?? new Set<number>();
      idsByType.set(entity_type, ids.add(entity_id));
    }

    const refs = new Map<string, AuditedEntityRef>();
    await Promise.all(
      [...idsByType].map(async ([entityType, ids]) => {
        const table = ENTITY_TABLES[entityType];
        if (!table) return;
        const found = await table(this.prisma.db(), { id: { in: [...ids] } });
        for (const ref of found) refs.set(entityKey(entityType, ref.id), ref);
      }),
    );

    return records.map((record) =>
      toEntity(
        record,
        record.entity_id === null
          ? null
          : (refs.get(entityKey(record.entity_type, record.entity_id)) ?? null),
      ),
    );
  }
}

function entityKey(entityType: AuditEntityType, id: number): string {
  return `${entityType}:${id}`;
}

function toEntity(
  record: AuditLogRecord,
  entity: AuditedEntityRef | null,
): AuditLogEntity {
  return {
    ...record,
    entity,
    old_values: record.old_values as AuditValues | null,
    new_values: record.new_values as AuditValues | null,
  };
}
