import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import { fromDbDate, toDbDate } from '../../../shared/date/date-only.js';
import type {
  CreateItemData,
  ItemEntity,
  ItemFilters,
  ItemsRepository,
  UpdateItemData,
} from '../domain/items.types.js';

const itemInclude = {
  custody_type: { select: { id: true, uuid: true, name: true } },
} satisfies Prisma.itemsInclude;

type ItemRecord = Prisma.itemsGetPayload<{ include: typeof itemInclude }>;

@Injectable()
export class PrismaItemsRepository implements ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateItemData): Promise<ItemEntity> {
    const record = await this.prisma.db().items.create({
      data: { ...data, purchase_date: toDbDate(data.purchase_date) },
      include: itemInclude,
    });
    return toEntity(record);
  }

  async findAll(
    filters: ItemFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ items: ItemEntity[]; total: number }> {
    const where: Prisma.itemsWhereInput = {
      custody_type_id: filters.custody_type_id,
      op_status: filters.op_status,
      tech_condition: filters.tech_condition,
      brand: filters.brand ? matchesIgnoringCase(filters.brand) : undefined,
      model: filters.model ? matchesIgnoringCase(filters.model) : undefined,
      serial_no: filters.search
        ? { contains: escapeLikePattern(filters.search), mode: 'insensitive' }
        : undefined,
      deleted_at: null,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.items.findMany({
        where,
        include: itemInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.items.count({ where }),
    ]);

    return { items: records.map(toEntity), total };
  }

  async findById(id: number): Promise<ItemEntity | null> {
    const record = await this.prisma.db().items.findFirst({
      where: { id, deleted_at: null },
      include: itemInclude,
    });
    return record && toEntity(record);
  }

  async findByIdForUpdate(id: number): Promise<ItemEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM items
      WHERE id = ${id} AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findById(id) : null;
  }

  async findByUuid(uuid: string): Promise<ItemEntity | null> {
    const record = await this.prisma.db().items.findFirst({
      where: { uuid, deleted_at: null },
      include: itemInclude,
    });
    return record && toEntity(record);
  }

  async findByUuidForUpdate(uuid: string): Promise<ItemEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM items
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findBySerialNo(serialNo: string): Promise<ItemEntity | null> {
    const [match] = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM items
      WHERE lower(serial_no) = lower(${serialNo}) AND deleted_at IS NULL
      LIMIT 1`;
    return match ? this.findById(match.id) : null;
  }

  async updateById(id: number, data: UpdateItemData): Promise<ItemEntity> {
    const record = await this.prisma.db().items.update({
      where: { id },
      data: { ...data, purchase_date: toDbDate(data.purchase_date) },
      include: itemInclude,
    });
    return toEntity(record);
  }

  countOpenPossessions(itemId: number): Promise<number> {
    return this.prisma.db().possessions.count({
      where: { item_id: itemId, ended_at: null },
    });
  }
}

function matchesIgnoringCase(
  value: string,
): Prisma.StringNullableFilter<'items'> {
  return { equals: escapeLikePattern(value), mode: 'insensitive' };
}

function toEntity(record: ItemRecord): ItemEntity {
  return { ...record, purchase_date: fromDbDate(record.purchase_date) };
}
