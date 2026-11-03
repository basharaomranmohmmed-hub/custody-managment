import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import type {
  CreateUserData,
  UpdateUserData,
  UserCredentials,
  UserEntity,
  UserFilters,
  UsersRepository,
} from '../domain/users.types.js';

const userInclude = {
  employee: {
    select: { id: true, uuid: true, employee_no: true, full_name: true },
  },
} satisfies Prisma.usersInclude;

type UserRecord = Prisma.usersGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const record = await this.prisma.db().users.create({
      data,
      include: userInclude,
    });
    return toEntity(record);
  }

  async findAll(
    filters: UserFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ users: UserEntity[]; total: number }> {
    const where: Prisma.usersWhereInput = {
      role: { in: [...filters.roles] },
      is_active: filters.is_active,
      OR: filters.search
        ? [
            { username: searchTerm(filters.search) },
            { name: searchTerm(filters.search) },
            { employee: { employee_no: searchTerm(filters.search) } },
            { employee: { full_name: searchTerm(filters.search) } },
          ]
        : undefined,
      deleted_at: null,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        include: userInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.users.count({ where }),
    ]);

    return { users: records.map(toEntity), total };
  }

  async findByUuid(uuid: string): Promise<UserEntity | null> {
    const record = await this.prisma.db().users.findFirst({
      where: { uuid, deleted_at: null },
      include: userInclude,
    });
    return record && toEntity(record);
  }

  async findByUuidForUpdate(uuid: string): Promise<UserEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM users
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR NO KEY UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const record = await this.prisma.db().users.findFirst({
      where: { username, deleted_at: null },
      include: userInclude,
    });
    return record && toEntity(record);
  }

  async findByEmployeeId(employeeId: number): Promise<UserEntity | null> {
    const record = await this.prisma.db().users.findFirst({
      where: { employee_id: employeeId, deleted_at: null },
      include: userInclude,
    });
    return record && toEntity(record);
  }

  findCredentialsByUsername(username: string): Promise<UserCredentials | null> {
    return this.prisma.db().users.findFirst({
      where: { username, deleted_at: null },
      select: { id: true, uuid: true, password_hash: true, is_active: true },
    });
  }

  async updateById(id: number, data: UpdateUserData): Promise<UserEntity> {
    const record = await this.prisma.db().users.update({
      where: { id },
      data,
      include: userInclude,
    });
    return toEntity(record);
  }
}

function searchTerm(search: string) {
  return { contains: escapeLikePattern(search), mode: 'insensitive' as const };
}

function toEntity({
  password_hash: _password_hash,
  ...user
}: UserRecord): UserEntity {
  return user;
}
