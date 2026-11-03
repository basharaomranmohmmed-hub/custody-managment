import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import type { IsoDate } from '../../../shared/date/date-only.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  DEPARTMENTS_REPOSITORY,
  type DepartmentEntity,
  type DepartmentsRepository,
} from '../../departments/domain/departments.types.js';
import {
  type UserEntity,
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../users/domain/users.types.js';
import {
  EMPLOYEES_REPOSITORY,
  type EmployeeEntity,
  type EmployeesRepository,
  type UpdateEmployeeData,
} from '../domain/employees.types.js';
import type { CreateEmployeeDto } from '../presentation/http/dto/create-employee.dto.js';
import type { FilterEmployeeDto } from '../presentation/http/dto/filter-employee.dto.js';
import type { UpdateEmployeeStatusDto } from '../presentation/http/dto/update-employee-status.dto.js';
import type { UpdateEmployeeDto } from '../presentation/http/dto/update-employee.dto.js';

@Injectable()
export class EmployeesApplicationService {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employeesRepository: EmployeesRepository,
    @Inject(DEPARTMENTS_REPOSITORY)
    private readonly departmentsRepository: DepartmentsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreateEmployeeDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'EMPLOYEE' },
      async () => {
        const department = await this.findDepartmentOrFail(dto.department_uuid);
        this.assertDepartmentActive(department);
        await this.assertEmployeeNoAvailable(dto.employee_no);

        const created = await this.employeesRepository.create({
          employee_no: dto.employee_no,
          full_name: dto.full_name,
          department_id: department.id,
          job_title: dto.job_title ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          joined_at: dto.joined_at ?? null,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterEmployeeDto) {
    let departmentId: number | undefined;
    if (filter.department_uuid !== undefined) {
      const department = await this.departmentsRepository.findByUuid(
        filter.department_uuid,
      );
      if (!department) {
        return successResponse({ response: { data: [], total: 0 } });
      }
      departmentId = department.id;
    }

    const { employees, total } = await this.employeesRepository.findAll(
      {
        department_id: departmentId,
        status: filter.status,
        search: filter.search,
      },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: employees, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findEmployeeOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateEmployeeDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'EMPLOYEE' },
      async (target) => {
        const department =
          dto.department_uuid !== undefined
            ? await this.findDepartmentOrFail(dto.department_uuid)
            : null;
        const employee = await this.findEmployeeOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = employee.id;

        const updateData: UpdateEmployeeData = {};
        if (
          dto.employee_no !== undefined &&
          dto.employee_no !== employee.employee_no
        ) {
          await this.assertEmployeeNoAvailable(dto.employee_no, employee.id);
          updateData.employee_no = dto.employee_no;
        }
        if (department && department.id !== employee.department_id) {
          this.assertDepartmentActive(department);
          updateData.department_id = department.id;
        }
        if (dto.joined_at !== undefined) {
          this.assertTerminationNotBeforeJoining(
            dto.joined_at,
            employee.terminated_at,
          );
          if (dto.joined_at !== employee.joined_at) {
            updateData.joined_at = dto.joined_at;
          }
        }
        if (
          dto.full_name !== undefined &&
          dto.full_name !== employee.full_name
        ) {
          updateData.full_name = dto.full_name;
        }
        if (
          dto.job_title !== undefined &&
          dto.job_title !== employee.job_title
        ) {
          updateData.job_title = dto.job_title;
        }
        if (dto.phone !== undefined && dto.phone !== employee.phone) {
          updateData.phone = dto.phone;
        }
        if (dto.email !== undefined && dto.email !== employee.email) {
          updateData.email = dto.email;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: successResponse({ response: employee }),
            change: null,
          };
        }

        const updated = await this.employeesRepository.updateById(
          employee.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: employee.id, before: employee, after: updated },
        };
      },
    );
  }

  updateStatus(
    uuid: string,
    dto: UpdateEmployeeStatusDto,
    user: AuthenticatedUser,
  ) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'EMPLOYEE' },
      async (target) => {
        const employee = await this.findEmployeeOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = employee.id;

        if (employee.status === 'TERMINATED' && dto.status !== 'TERMINATED') {
          throw new AppException({
            message: 'لا يمكن تغيير حالة موظف منتهية خدمته',
            errorCode: 'EMPLOYEE_TERMINATED',
            statusCode: HttpStatus.CONFLICT,
          });
        }

        let terminatedAt: IsoDate | null = null;
        if (dto.status === 'TERMINATED') {
          if (!dto.terminated_at) {
            throw new AppException({
              message: 'تاريخ إنهاء الخدمة مطلوب عند إنهاء خدمة الموظف',
              errorCode: 'TERMINATION_DATE_REQUIRED',
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
          this.assertTerminationNotBeforeJoining(
            employee.joined_at,
            dto.terminated_at,
          );
          terminatedAt = dto.terminated_at;
        } else if (dto.terminated_at) {
          throw new AppException({
            message: 'تاريخ إنهاء الخدمة يُحدد فقط عند إنهاء خدمة الموظف',
            errorCode: 'TERMINATION_DATE_NOT_ALLOWED',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        if (
          employee.status === dto.status &&
          employee.terminated_at === terminatedAt
        ) {
          return {
            result: successResponse({ response: employee }),
            change: null,
          };
        }

        const terminates =
          dto.status === 'TERMINATED' && employee.status !== 'TERMINATED';
        if (terminates) await this.assertNoOpenPossessions(employee.id);
        const linkedAccount = terminates
          ? await this.lockLinkedAccountToDeactivate(employee, user)
          : null;

        const updated = await this.employeesRepository.updateById(employee.id, {
          status: dto.status,
          terminated_at: terminatedAt,
        });
        if (linkedAccount) await this.deactivateAccount(linkedAccount);

        return {
          result: successResponse({ response: updated }),
          change: { entityId: employee.id, before: employee, after: updated },
        };
      },
    );
  }

  private async findEmployeeOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<EmployeeEntity> {
    const employee = forUpdate
      ? await this.employeesRepository.findByUuidForUpdate(uuid)
      : await this.employeesRepository.findByUuid(uuid);
    if (!employee) {
      throw new AppException({
        message: 'الموظف غير موجود',
        errorCode: 'EMPLOYEE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return employee;
  }

  private async findDepartmentOrFail(uuid: string): Promise<DepartmentEntity> {
    const department = await this.departmentsRepository.findByUuid(uuid);
    if (!department) {
      throw new AppException({
        message: 'القسم غير موجود',
        errorCode: 'DEPARTMENT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return department;
  }

  private assertDepartmentActive(department: DepartmentEntity) {
    if (!department.is_active) {
      throw new AppException({
        message: `القسم "${department.name}" معطل ولا يمكن إضافة موظفين إليه`,
        errorCode: 'DEPARTMENT_INACTIVE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertEmployeeNoAvailable(
    employeeNo: string,
    excludeId?: number,
  ) {
    const existing =
      await this.employeesRepository.findByEmployeeNo(employeeNo);
    if (existing && existing.id !== excludeId) {
      throw new AppException({
        message: `الرقم الوظيفي "${existing.employee_no}" مستخدم مسبقاً`,
        errorCode: 'EMPLOYEE_NO_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertNoOpenPossessions(employeeId: number) {
    const openPossessions =
      await this.employeesRepository.countOpenPossessions(employeeId);
    if (openPossessions > 0) {
      throw new AppException({
        message: `لا يمكن إنهاء خدمة الموظف لأنه يحمل ${openPossessions} عهدة، يجب استلامها أولاً`,
        errorCode: 'EMPLOYEE_HAS_OPEN_POSSESSIONS',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async lockLinkedAccountToDeactivate(
    employee: EmployeeEntity,
    user: AuthenticatedUser,
  ): Promise<UserEntity | null> {
    const linked = await this.usersRepository.findByEmployeeId(employee.id);
    if (!linked) return null;

    const account = await this.usersRepository.findByUuidForUpdate(linked.uuid);
    if (!account?.is_active) return null;

    if (account.id === user.id) {
      throw new AppException({
        message: 'لا يمكنك إنهاء خدمة الموظف المرتبط بحسابك',
        errorCode: 'OWN_EMPLOYEE_TERMINATION_NOT_ALLOWED',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    if (account.role === 'ADMIN') {
      throw new AppException({
        message: `لا يمكن إنهاء خدمة الموظف "${employee.employee_no}" لأنه مرتبط بحساب مدير النظام`,
        errorCode: 'EMPLOYEE_LINKED_TO_ADMIN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    return account;
  }

  private deactivateAccount(account: UserEntity) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'USER', entityId: account.id },
      async () => {
        const updated = await this.usersRepository.updateById(account.id, {
          is_active: false,
        });

        return {
          result: updated,
          change: { entityId: account.id, before: account, after: updated },
        };
      },
    );
  }

  private assertTerminationNotBeforeJoining(
    joinedAt: IsoDate | null,
    terminatedAt: IsoDate | null,
  ) {
    if (joinedAt && terminatedAt && terminatedAt < joinedAt) {
      throw new AppException({
        message: 'تاريخ إنهاء الخدمة لا يمكن أن يكون قبل تاريخ المباشرة',
        errorCode: 'INVALID_TERMINATION_DATE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
