import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import type {
  CreateCustodyTypeData,
  CustodyTypeEntity,
  CustodyTypeFilters,
  CustodyTypesRepository,
  UpdateCustodyTypeData,
} from '../domain/custody-types.types.js';

@Injectable()
export class PrismaCustodyTypesRepository implements CustodyTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCustodyTypeData): Promise<CustodyTypeEntity> {
    return this.prisma.db().custody_types.create({ data });
  }

  async findAll(
    filters: CustodyTypeFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ custody_types: CustodyTypeEntity[]; total: number }> {
    const where: Prisma.custody_typesWhereInput = {
      is_active: filters.is_active,
      name: filters.search
        ? { contains: escapeLikePattern(filters.search), mode: 'insensitive' }
        : undefined,
      deleted_at: null,
    };

    const [custody_types, total] = await this.prisma.$transaction([
      this.prisma.custody_types.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.custody_types.count({ where }),
    ]);

    return { custody_types, total };
  }

  findById(id: number): Promise<CustodyTypeEntity | null> {
    return this.prisma.db().custody_types.findFirst({
      where: { id, deleted_at: null },
    });
  }

  findByUuid(uuid: string): Promise<CustodyTypeEntity | null> {
    return this.prisma.db().custody_types.findFirst({
      where: { uuid, deleted_at: null },
    });
  }

  async findByUuidForUpdate(uuid: string): Promise<CustodyTypeEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM custody_types
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR NO KEY UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findByName(name: string): Promise<CustodyTypeEntity | null> {
    return this.prisma.db().custody_types.findFirst({
      where: {
        name: {
          equals: escapeLikePattern(name),
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });
  }

  updateById(
    id: number,
    data: UpdateCustodyTypeData,
  ): Promise<CustodyTypeEntity> {
    return this.prisma.db().custody_types.update({ where: { id }, data });
  }
}
