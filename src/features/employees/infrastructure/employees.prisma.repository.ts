import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import { fromDbDate, toDbDate } from '../../../shared/date/date-only.js';
import type {
  CreateEmployeeData,
  EmployeeEntity,
  EmployeeFilters,
  EmployeesRepository,
  UpdateEmployeeData,
} from '../domain/employees.types.js';

const employeeInclude = {
  department: { select: { id: true, uuid: true, name: true } },
} satisfies Prisma.employeesInclude;

type EmployeeRecord = Prisma.employeesGetPayload<{
  include: typeof employeeInclude;
}>;

@Injectable()
export class PrismaEmployeesRepository implements EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEmployeeData): Promise<EmployeeEntity> {
    const record = await this.prisma.db().employees.create({
      data: { ...data, joined_at: toDbDate(data.joined_at) },
      include: employeeInclude,
    });
    return toEntity(record);
  }

  async findAll(
    filters: EmployeeFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ employees: EmployeeEntity[]; total: number }> {
    const pattern = filters.search && escapeLikePattern(filters.search);
    const where: Prisma.employeesWhereInput = {
      department_id: filters.department_id,
      status: filters.status,
      OR: pattern
        ? [
            { full_name: { contains: pattern, mode: 'insensitive' } },
            { employee_no: { contains: pattern, mode: 'insensitive' } },
          ]
        : undefined,
      deleted_at: null,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.employees.findMany({
        where,
        include: employeeInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.employees.count({ where }),
    ]);

    return { employees: records.map(toEntity), total };
  }

  async findById(id: number): Promise<EmployeeEntity | null> {
    const record = await this.prisma.db().employees.findFirst({
      where: { id, deleted_at: null },
      include: employeeInclude,
    });
    return record && toEntity(record);
  }

  async findByIdForUpdate(id: number): Promise<EmployeeEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM employees
      WHERE id = ${id} AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findById(id) : null;
  }

  async findByUuid(uuid: string): Promise<EmployeeEntity | null> {
    const record = await this.prisma.db().employees.findFirst({
      where: { uuid, deleted_at: null },
      include: employeeInclude,
    });
    return record && toEntity(record);
  }

  async findByUuidForUpdate(uuid: string): Promise<EmployeeEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM employees
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findByEmployeeNo(employeeNo: string): Promise<EmployeeEntity | null> {
    const [match] = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM employees
      WHERE lower(employee_no) = lower(${employeeNo}) AND deleted_at IS NULL
      LIMIT 1`;
    return match ? this.findById(match.id) : null;
  }

  async updateById(
    id: number,
    data: UpdateEmployeeData,
  ): Promise<EmployeeEntity> {
    const record = await this.prisma.db().employees.update({
      where: { id },
      data: {
        ...data,
        joined_at: toDbDate(data.joined_at),
        terminated_at: toDbDate(data.terminated_at),
      },
      include: employeeInclude,
    });
    return toEntity(record);
  }

  countOpenPossessions(employeeId: number): Promise<number> {
    return this.prisma.db().possessions.count({
      where: { employee_id: employeeId, ended_at: null },
    });
  }
}

function toEntity(record: EmployeeRecord): EmployeeEntity {
  return {
    ...record,
    joined_at: fromDbDate(record.joined_at),
    terminated_at: fromDbDate(record.terminated_at),
  };
}
