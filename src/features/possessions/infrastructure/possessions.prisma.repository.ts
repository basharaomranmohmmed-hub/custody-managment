import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { fromDbDate, toDbDate } from '../../../shared/date/date-only.js';
import type {
  ClosePossessionData,
  CreatePossessionData,
  PossessionDetailsEntity,
  PossessionEntity,
  PossessionFilters,
  PossessionsRepository,
} from '../domain/possessions.types.js';

const possessionInclude = {
  item: {
    select: {
      id: true,
      uuid: true,
      serial_no: true,
      custody_type: { select: { id: true, uuid: true, name: true } },
    },
  },
  employee: {
    select: { id: true, uuid: true, employee_no: true, full_name: true },
  },
  department: { select: { id: true, uuid: true, name: true } },
} satisfies Prisma.possessionsInclude;

const possessionEventSelect = {
  id: true,
  event_type: true,
  op_status_before: true,
  op_status_after: true,
  condition_before: true,
  condition_after: true,
  reason: true,
  occurred_at: true,
  recorded_at: true,
  document_id: true,
  performed_by: true,
  performer: { select: { id: true, uuid: true, username: true } },
} satisfies Prisma.item_eventsSelect;

const possessionDetailsInclude = {
  ...possessionInclude,
  start_event: { select: possessionEventSelect },
  end_event: { select: possessionEventSelect },
} satisfies Prisma.possessionsInclude;

type PossessionRecord = Prisma.possessionsGetPayload<{
  include: typeof possessionInclude;
}>;

type PossessionDetailsRecord = Prisma.possessionsGetPayload<{
  include: typeof possessionDetailsInclude;
}>;

@Injectable()
export class PrismaPossessionsRepository implements PossessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePossessionData): Promise<PossessionEntity> {
    const record = await this.prisma.db().possessions.create({
      data: { ...data, due_date: toDbDate(data.due_date) },
      include: possessionInclude,
    });
    return toEntity(record);
  }

  async findAll(
    filters: PossessionFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ possessions: PossessionEntity[]; total: number }> {
    const where: Prisma.possessionsWhereInput = {
      item_id: filters.item_id,
      employee_id: filters.employee_id,
      department_id: filters.department_id,
      ended_at:
        filters.status === 'OPEN'
          ? null
          : filters.status === 'CLOSED'
            ? { not: null }
            : undefined,
      started_at:
        filters.started_from || filters.started_to
          ? { gte: filters.started_from, lte: filters.started_to }
          : undefined,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.possessions.findMany({
        where,
        include: possessionInclude,
        orderBy: [{ started_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.possessions.count({ where }),
    ]);

    return { possessions: records.map(toEntity), total };
  }

  async findById(id: number): Promise<PossessionEntity | null> {
    const record = await this.prisma.db().possessions.findUnique({
      where: { id },
      include: possessionInclude,
    });
    return record && toEntity(record);
  }

  async findByUuid(uuid: string): Promise<PossessionEntity | null> {
    const record = await this.prisma.db().possessions.findUnique({
      where: { uuid },
      include: possessionInclude,
    });
    return record && toEntity(record);
  }

  async findDetailsByUuid(
    uuid: string,
  ): Promise<PossessionDetailsEntity | null> {
    const record = await this.prisma.db().possessions.findUnique({
      where: { uuid },
      include: possessionDetailsInclude,
    });
    return record && toDetailsEntity(record);
  }

  async findOpenByItemId(itemId: number): Promise<PossessionEntity | null> {
    const record = await this.prisma.db().possessions.findFirst({
      where: { item_id: itemId, ended_at: null },
      include: possessionInclude,
    });
    return record && toEntity(record);
  }

  async closeById(
    id: number,
    data: ClosePossessionData,
  ): Promise<PossessionEntity> {
    const record = await this.prisma.db().possessions.update({
      where: { id, ended_at: null },
      data,
      include: possessionInclude,
    });
    return toEntity(record);
  }
}

function toEntity(record: PossessionRecord): PossessionEntity {
  return { ...record, due_date: fromDbDate(record.due_date) };
}

function toDetailsEntity(
  record: PossessionDetailsRecord,
): PossessionDetailsEntity {
  const { start_event, end_event, ...possession } = record;
  return { ...toEntity(possession), start_event, end_event };
}
