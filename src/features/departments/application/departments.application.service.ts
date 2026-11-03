import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  DEPARTMENTS_REPOSITORY,
  type DepartmentEntity,
  type DepartmentsRepository,
  type UpdateDepartmentData,
} from '../domain/departments.types.js';
import type { CreateDepartmentDto } from '../presentation/http/dto/create-department.dto.js';
import type { FilterDepartmentDto } from '../presentation/http/dto/filter-department.dto.js';
import type { UpdateDepartmentStatusDto } from '../presentation/http/dto/update-department-status.dto.js';
import type { UpdateDepartmentDto } from '../presentation/http/dto/update-department.dto.js';

@Injectable()
export class DepartmentsApplicationService {
  constructor(
    @Inject(DEPARTMENTS_REPOSITORY)
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreateDepartmentDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'DEPARTMENT' },
      async () => {
        await this.assertNameAvailable(dto.name);

        const created = await this.departmentsRepository.create({
          name: dto.name,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterDepartmentDto) {
    const { departments, total } = await this.departmentsRepository.findAll(
      { is_active: filter.is_active, search: filter.search },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: departments, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findDepartmentOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateDepartmentDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'DEPARTMENT' },
      async (target) => {
        const department = await this.findDepartmentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = department.id;

        const updateData: UpdateDepartmentData = {};
        if (dto.name !== undefined && dto.name !== department.name) {
          await this.assertNameAvailable(dto.name, department.id);
          updateData.name = dto.name;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: successResponse({ response: department }),
            change: null,
          };
        }

        const updated = await this.departmentsRepository.updateById(
          department.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: {
            entityId: department.id,
            before: department,
            after: updated,
          },
        };
      },
    );
  }

  updateActiveStatus(uuid: string, dto: UpdateDepartmentStatusDto) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'DEPARTMENT' },
      async (target) => {
        const department = await this.findDepartmentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = department.id;

        if (department.is_active === dto.is_active) {
          return {
            result: successResponse({ response: department }),
            change: null,
          };
        }

        if (!dto.is_active) {
          await this.assertHasNoActiveEmployees(department.id);
        }

        const updated = await this.departmentsRepository.updateById(
          department.id,
          { is_active: dto.is_active },
        );

        return {
          result: successResponse({ response: updated }),
          change: {
            entityId: department.id,
            before: department,
            after: updated,
          },
        };
      },
    );
  }

  private async findDepartmentOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<DepartmentEntity> {
    const department = forUpdate
      ? await this.departmentsRepository.findByUuidForUpdate(uuid)
      : await this.departmentsRepository.findByUuid(uuid);
    if (!department) {
      throw new AppException({
        message: 'القسم غير موجود',
        errorCode: 'DEPARTMENT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return department;
  }

  private async assertNameAvailable(name: string, excludeId?: number) {
    const existing = await this.departmentsRepository.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new AppException({
        message: `يوجد قسم بنفس الاسم "${existing.name}"`,
        errorCode: 'DEPARTMENT_NAME_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertHasNoActiveEmployees(departmentId: number) {
    const activeEmployees =
      await this.departmentsRepository.countNonTerminatedEmployees(
        departmentId,
      );
    if (activeEmployees > 0) {
      throw new AppException({
        message: `لا يمكن تعطيل القسم لوجود ${activeEmployees} موظف غير منتهية خدمتهم فيه، انقلهم أولاً`,
        errorCode: 'DEPARTMENT_HAS_ACTIVE_EMPLOYEES',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }
}
