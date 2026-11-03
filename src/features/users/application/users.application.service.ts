import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  type EmployeeEntity,
  EMPLOYEES_REPOSITORY,
  type EmployeesRepository,
} from '../../employees/domain/employees.types.js';
import {
  ASSIGNABLE_USER_ROLES,
  PASSWORD_SALT_ROUNDS,
  type UpdateUserData,
  type UserEntity,
  USERS_REPOSITORY,
  type UsersRepository,
} from '../domain/users.types.js';
import type { CreateUserDto } from '../presentation/http/dto/create-user.dto.js';
import type { FilterUserDto } from '../presentation/http/dto/filter-user.dto.js';
import type { ResetUserPasswordDto } from '../presentation/http/dto/reset-user-password.dto.js';
import type { UpdateUserStatusDto } from '../presentation/http/dto/update-user-status.dto.js';
import type { UpdateUserDto } from '../presentation/http/dto/update-user.dto.js';

@Injectable()
export class UsersApplicationService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employeesRepository: EmployeesRepository,
    private readonly auditTrail: AuditTrail,
  ) {}

  async create(dto: CreateUserDto, user: AuthenticatedUser) {
    const password_hash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'USER' },
      async () => {
        const employee = dto.employee_uuid
          ? await this.findEmployeeOrFail(dto.employee_uuid)
          : null;

        await this.assertUsernameAvailable(dto.username);
        if (employee) await this.assertEmployeeLinkable(employee);

        const created = await this.usersRepository.create({
          username: dto.username,
          password_hash,
          name: dto.name ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          role: dto.role,
          employee_id: employee?.id ?? null,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterUserDto) {
    const { users, total } = await this.usersRepository.findAll(
      {
        roles: filter.role ? [filter.role] : ASSIGNABLE_USER_ROLES,
        is_active: filter.is_active,
        search: filter.search,
      },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: users, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findManagedUserOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateUserDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'USER' },
      async () => {
        const employee = dto.employee_uuid
          ? await this.findEmployeeOrFail(dto.employee_uuid)
          : null;
        const target = await this.findManagedUserOrFail(uuid, {
          forUpdate: true,
        });

        if (dto.username !== undefined && dto.username !== target.username) {
          await this.assertUsernameAvailable(dto.username);
        }
        if (employee && employee.id !== target.employee_id) {
          await this.assertEmployeeLinkable(employee);
        }

        const updateData: UpdateUserData = {};
        if (dto.username !== undefined) updateData.username = dto.username;
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.role !== undefined) updateData.role = dto.role;
        if (dto.employee_uuid !== undefined) {
          updateData.employee_id = employee?.id ?? null;
        }

        const updated = await this.usersRepository.updateById(
          target.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: target.id, before: target, after: updated },
        };
      },
    );
  }

  updateActiveStatus(uuid: string, dto: UpdateUserStatusDto) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'USER' },
      async () => {
        const target = await this.findManagedUserOrFail(uuid, {
          forUpdate: true,
        });

        if (target.is_active === dto.is_active) {
          return {
            result: successResponse({ response: target }),
            change: null,
          };
        }
        if (dto.is_active) await this.assertLinkedEmployeeNotTerminated(target);

        const updated = await this.usersRepository.updateById(target.id, {
          is_active: dto.is_active,
        });

        return {
          result: successResponse({ response: updated }),
          change: { entityId: target.id, before: target, after: updated },
        };
      },
    );
  }

  async resetPassword(uuid: string, dto: ResetUserPasswordDto) {
    const password_hash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'USER' },
      async () => {
        const target = await this.findManagedUserOrFail(uuid, {
          forUpdate: true,
        });
        const updated = await this.usersRepository.updateById(target.id, {
          password_hash,
        });

        return {
          result: successResponse({ response: updated }),
          change: {
            entityId: target.id,
            before: { password: 'previous' },
            after: { password: 'replaced' },
          },
        };
      },
    );
  }

  private async findManagedUserOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<UserEntity> {
    const user = forUpdate
      ? await this.usersRepository.findByUuidForUpdate(uuid)
      : await this.usersRepository.findByUuid(uuid);
    if (!user) {
      throw new AppException({
        message: 'المستخدم غير موجود',
        errorCode: 'USER_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (user.role === 'ADMIN') {
      throw new AppException({
        message: 'حساب مدير النظام لا يُدار من واجهة إدارة الحسابات',
        errorCode: 'ADMIN_ACCOUNT_PROTECTED',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return user;
  }

  private async findEmployeeOrFail(uuid: string): Promise<EmployeeEntity> {
    const employee = await this.employeesRepository.findByUuid(uuid);
    if (!employee) {
      throw new AppException({
        message: 'الموظف غير موجود',
        errorCode: 'EMPLOYEE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return employee;
  }

  private async assertUsernameAvailable(username: string) {
    if (await this.usersRepository.findByUsername(username)) {
      throw new AppException({
        message: `اسم المستخدم "${username}" مستخدم مسبقاً`,
        errorCode: 'USER_USERNAME_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertLinkedEmployeeNotTerminated(target: UserEntity) {
    if (target.employee_id === null) return;
    const employee = await this.employeesRepository.findById(
      target.employee_id,
    );
    if (employee?.status === 'TERMINATED') {
      throw new AppException({
        message: `لا يمكن تفعيل الحساب لأن الموظف "${employee.employee_no}" المرتبط به منتهية خدمته`,
        errorCode: 'EMPLOYEE_TERMINATED',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertEmployeeLinkable(employee: EmployeeEntity) {
    if (employee.status === 'TERMINATED') {
      throw new AppException({
        message: `الموظف "${employee.employee_no}" منتهية خدمته ولا يمكن ربطه بحساب مستخدم`,
        errorCode: 'EMPLOYEE_TERMINATED',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    const linked = await this.usersRepository.findByEmployeeId(employee.id);
    if (linked) {
      throw new AppException({
        message: `الموظف "${employee.employee_no}" مرتبط مسبقاً بالمستخدم "${linked.username}"`,
        errorCode: 'EMPLOYEE_ALREADY_LINKED',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }
}
