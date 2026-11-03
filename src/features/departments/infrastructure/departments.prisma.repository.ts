import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import type {
  CreateDepartmentData,
  DepartmentEntity,
  DepartmentFilters,
  DepartmentsRepository,
  UpdateDepartmentData,
} from '../domain/departments.types.js';

@Injectable()
export class PrismaDepartmentsRepository implements DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDepartmentData): Promise<DepartmentEntity> {
    return this.prisma.db().departments.create({ data });
  }

  async findAll(
    filters: DepartmentFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ departments: DepartmentEntity[]; total: number }> {
    const where: Prisma.departmentsWhereInput = {
      is_active: filters.is_active,
      name: filters.search
        ? { contains: escapeLikePattern(filters.search), mode: 'insensitive' }
        : undefined,
      deleted_at: null,
    };

    const [departments, total] = await this.prisma.$transaction([
      this.prisma.departments.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.departments.count({ where }),
    ]);

    return { departments, total };
  }

  findById(id: number): Promise<DepartmentEntity | null> {
    return this.prisma.db().departments.findFirst({
      where: { id, deleted_at: null },
    });
  }

  findByUuid(uuid: string): Promise<DepartmentEntity | null> {
    return this.prisma.db().departments.findFirst({
      where: { uuid, deleted_at: null },
    });
  }

  async findByUuidForUpdate(uuid: string): Promise<DepartmentEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM departments
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR NO KEY UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findByName(name: string): Promise<DepartmentEntity | null> {
    return this.prisma.db().departments.findFirst({
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
    data: UpdateDepartmentData,
  ): Promise<DepartmentEntity> {
    return this.prisma.db().departments.update({ where: { id }, data });
  }

  countNonTerminatedEmployees(departmentId: number): Promise<number> {
    return this.prisma.db().employees.count({
      where: {
        department_id: departmentId,
        status: { not: 'TERMINATED' },
        deleted_at: null,
      },
    });
  }
}
