import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import type {
  CreateItemEventData,
  ItemEventEntity,
  ItemEventFilters,
  ItemEventsRepository,
} from '../domain/item-events.types.js';

const itemEventInclude = {
  item: { select: { id: true, uuid: true, serial_no: true } },
  started_possession: { select: { id: true, uuid: true } },
  ended_possession: { select: { id: true, uuid: true } },
  report: { select: { id: true, uuid: true } },
  performer: { select: { id: true, uuid: true, username: true } },
} satisfies Prisma.item_eventsInclude;

type ItemEventRecord = Prisma.item_eventsGetPayload<{
  include: typeof itemEventInclude;
}>;

@Injectable()
export class PrismaItemEventsRepository implements ItemEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateItemEventData): Promise<ItemEventEntity> {
    const record = await this.prisma.db().item_events.create({
      data,
      include: itemEventInclude,
    });
    return toEntity(record);
  }

  async findAll(
    filters: ItemEventFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ item_events: ItemEventEntity[]; total: number }> {
    const where: Prisma.item_eventsWhereInput = {
      item: filters.item_uuid ? { uuid: filters.item_uuid } : undefined,
      event_type: filters.event_type,
      occurred_at:
        filters.occurred_from || filters.occurred_to
          ? { gte: filters.occurred_from, lte: filters.occurred_to }
          : undefined,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.item_events.findMany({
        where,
        include: itemEventInclude,
        orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.item_events.count({ where }),
    ]);

    return { item_events: records.map(toEntity), total };
  }

  async findByUuid(uuid: string): Promise<ItemEventEntity | null> {
    const record = await this.prisma.db().item_events.findUnique({
      where: { uuid },
      include: itemEventInclude,
    });
    return record && toEntity(record);
  }

  async findLatestOccurredAt(itemId: number): Promise<Date | null> {
    const latest = await this.prisma.db().item_events.findFirst({
      where: { item_id: itemId },
      orderBy: { occurred_at: 'desc' },
      select: { occurred_at: true },
    });
    return latest?.occurred_at ?? null;
  }
}

function toEntity(record: ItemEventRecord): ItemEventEntity {
  const {
    started_possession,
    ended_possession,
    report_id: _report_id,
    ...event
  } = record;
  return { ...event, possession: started_possession ?? ended_possession };
}
