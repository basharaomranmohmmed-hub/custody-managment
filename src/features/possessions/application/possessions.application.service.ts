import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import {
  earliestCalendarDate,
  latestCalendarDate,
} from '../../../shared/date/date-only.js';
import { resolvePastInstant } from '../../../shared/date/instant.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  DEPARTMENTS_REPOSITORY,
  type DepartmentsRepository,
} from '../../departments/domain/departments.types.js';
import {
  type EmployeeEntity,
  EMPLOYEES_REPOSITORY,
  type EmployeesRepository,
} from '../../employees/domain/employees.types.js';
import { ItemEventRecorder } from '../../item-events/application/item-event-recorder.js';
import {
  type ItemEntity,
  ITEMS_REPOSITORY,
  type ItemsRepository,
} from '../../items/domain/items.types.js';
import {
  type PossessionDetailsEntity,
  type PossessionEntity,
  type PossessionFilters,
  POSSESSIONS_REPOSITORY,
  type PossessionsRepository,
} from '../domain/possessions.types.js';
import type { CreatePossessionDto } from '../presentation/http/dto/create-possession.dto.js';
import type { FilterPossessionDto } from '../presentation/http/dto/filter-possession.dto.js';
import type { ReturnPossessionDto } from '../presentation/http/dto/return-possession.dto.js';

const toInstant = (value?: string) => (value ? new Date(value) : undefined);

@Injectable()
export class PossessionsApplicationService {
  constructor(
    @Inject(POSSESSIONS_REPOSITORY)
    private readonly possessionsRepository: PossessionsRepository,
    @Inject(ITEMS_REPOSITORY)
    private readonly itemsRepository: ItemsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employeesRepository: EmployeesRepository,
    @Inject(DEPARTMENTS_REPOSITORY)
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly itemEventRecorder: ItemEventRecorder,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreatePossessionDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'HANDOVER', entityType: 'POSSESSION' },
      async () => {
        const item = await this.findItemForUpdateOrFail(dto.item_uuid);
        const employee = await this.findEmployeeForUpdateOrFail(
          dto.employee_uuid,
        );

        const startedAt = resolvePastInstant(toInstant(dto.started_at));
        if (!startedAt) {
          throw new AppException({
            message: 'تاريخ التسليم لا يمكن أن يكون في المستقبل',
            errorCode: 'INVALID_HANDOVER_DATE',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        if (dto.due_date && dto.due_date < earliestCalendarDate(startedAt)) {
          throw new AppException({
            message: 'تاريخ الاستحقاق لا يمكن أن يكون قبل تاريخ التسليم',
            errorCode: 'INVALID_DUE_DATE',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        this.assertItemAvailable(item);
        await this.assertItemNotHeld(item);
        this.assertEmployeeCanReceive(employee, startedAt);

        const startEvent = await this.itemEventRecorder.record({
          item_id: item.id,
          event_type: 'HANDOVER',
          op_status_before: item.op_status,
          op_status_after: item.op_status,
          condition_before: item.tech_condition,
          condition_after: item.tech_condition,
          occurred_at: startedAt,
        });

        const created = await this.possessionsRepository.create({
          item_id: item.id,
          employee_id: employee.id,
          department_id: employee.department_id,
          start_event_id: startEvent.id,
          started_at: startedAt,
          due_date: dto.due_date ?? null,
          accessories: dto.accessories ?? null,
          condition_at_start: item.tech_condition,
          notes: dto.notes ?? null,
          created_by: user.id,
        });
        const details = await this.findDetailsOrFail(created.uuid);

        return {
          result: successResponse({ response: details }),
          change: { entityId: details.id, after: details },
        };
      },
    );
  }

  async findAll(filter: FilterPossessionDto) {
    const startedFrom = toInstant(filter.started_from);
    const startedTo = toInstant(filter.started_to);
    if (startedFrom && startedTo && startedFrom > startedTo) {
      throw new AppException({
        message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
        errorCode: 'INVALID_DATE_RANGE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const filters: PossessionFilters = {
      status: filter.status,
      started_from: startedFrom,
      started_to: startedTo,
    };
    if (filter.item_uuid !== undefined) {
      const item = await this.itemsRepository.findByUuid(filter.item_uuid);
      if (!item) return this.emptyPage();
      filters.item_id = item.id;
    }
    if (filter.employee_uuid !== undefined) {
      const employee = await this.employeesRepository.findByUuid(
        filter.employee_uuid,
      );
      if (!employee) return this.emptyPage();
      filters.employee_id = employee.id;
    }
    if (filter.department_uuid !== undefined) {
      const department = await this.departmentsRepository.findByUuid(
        filter.department_uuid,
      );
      if (!department) return this.emptyPage();
      filters.department_id = department.id;
    }

    const { possessions, total } = await this.possessionsRepository.findAll(
      filters,
      resolvePagination(filter),
    );

    return successResponse({ response: { data: possessions, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findDetailsOrFail(uuid);
    return successResponse({ response });
  }

  returnPossession(uuid: string, dto: ReturnPossessionDto) {
    return this.auditTrail.run(
      { action: 'RETURN', entityType: 'POSSESSION' },
      async (target) => {
        const { item_id } = await this.findPossessionOrFail(uuid);
        const item = await this.lockItemOrFail(item_id);
        const possession = await this.findPossessionOrFail(uuid);
        target.entityId = possession.id;

        const endedAt = resolvePastInstant(toInstant(dto.ended_at));
        if (!endedAt) {
          throw new AppException({
            message: 'تاريخ الاستلام لا يمكن أن يكون في المستقبل',
            errorCode: 'INVALID_RETURN_DATE',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        if (possession.ended_at) {
          throw new AppException({
            message: 'تم استلام العهدة مسبقاً',
            errorCode: 'POSSESSION_ALREADY_RETURNED',
            statusCode: HttpStatus.CONFLICT,
          });
        }
        if (endedAt < possession.started_at) {
          throw new AppException({
            message: 'تاريخ الاستلام لا يمكن أن يكون قبل تاريخ التسليم',
            errorCode: 'INVALID_RETURN_DATE',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        const endEvent = await this.itemEventRecorder.record({
          item_id: item.id,
          event_type: 'RETURN',
          op_status_before: item.op_status,
          op_status_after: item.op_status,
          condition_before: item.tech_condition,
          condition_after: dto.condition_at_end,
          reason: dto.end_reason ?? null,
          occurred_at: endedAt,
        });

        if (dto.condition_at_end !== item.tech_condition) {
          await this.itemsRepository.updateById(item.id, {
            tech_condition: dto.condition_at_end,
          });
        }

        await this.possessionsRepository.closeById(possession.id, {
          end_event_id: endEvent.id,
          ended_at: endedAt,
          end_reason: dto.end_reason ?? null,
          condition_at_end: dto.condition_at_end,
        });
        const details = await this.findDetailsOrFail(uuid);

        return {
          result: successResponse({ response: details }),
          change: {
            entityId: possession.id,
            before: possession,
            after: details,
          },
        };
      },
    );
  }

  private emptyPage() {
    return successResponse({ response: { data: [], total: 0 } });
  }

  private async findPossessionOrFail(uuid: string): Promise<PossessionEntity> {
    const possession = await this.possessionsRepository.findByUuid(uuid);
    if (!possession) throw this.possessionNotFound();
    return possession;
  }

  private async findDetailsOrFail(
    uuid: string,
  ): Promise<PossessionDetailsEntity> {
    const possession = await this.possessionsRepository.findDetailsByUuid(uuid);
    if (!possession) throw this.possessionNotFound();
    return possession;
  }

  private possessionNotFound() {
    return new AppException({
      message: 'العهدة غير موجودة',
      errorCode: 'POSSESSION_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }

  private async findItemForUpdateOrFail(uuid: string): Promise<ItemEntity> {
    const item = await this.itemsRepository.findByUuidForUpdate(uuid);
    if (!item) throw this.itemNotFound();
    return item;
  }

  private async lockItemOrFail(id: number): Promise<ItemEntity> {
    const item = await this.itemsRepository.findByIdForUpdate(id);
    if (!item) throw this.itemNotFound();
    return item;
  }

  private itemNotFound() {
    return new AppException({
      message: 'المادة غير موجودة',
      errorCode: 'ITEM_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }

  private async findEmployeeForUpdateOrFail(
    uuid: string,
  ): Promise<EmployeeEntity> {
    const employee = await this.employeesRepository.findByUuidForUpdate(uuid);
    if (!employee) {
      throw new AppException({
        message: 'الموظف غير موجود',
        errorCode: 'EMPLOYEE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return employee;
  }

  private assertItemAvailable(item: ItemEntity) {
    if (item.op_status !== 'IN_SERVICE' || item.tech_condition !== 'GOOD') {
      throw new AppException({
        message: `لا يمكن تسليم المادة "${item.serial_no}"، يُسلَّم فقط ما كان في الخدمة وبحالة جيدة`,
        errorCode: 'ITEM_NOT_AVAILABLE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertItemNotHeld(item: ItemEntity) {
    const openPossession = await this.possessionsRepository.findOpenByItemId(
      item.id,
    );
    if (openPossession) {
      throw new AppException({
        message: `المادة "${item.serial_no}" ما زالت مسلّمة لموظف آخر`,
        errorCode: 'ITEM_ALREADY_HANDED_OVER',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private assertEmployeeCanReceive(employee: EmployeeEntity, startedAt: Date) {
    if (employee.status !== 'ACTIVE') {
      throw new AppException({
        message: `الموظف "${employee.full_name}" غير فعال ولا يمكن تسليمه عهدة`,
        errorCode: 'EMPLOYEE_NOT_ACTIVE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (
      employee.joined_at &&
      latestCalendarDate(startedAt) < employee.joined_at
    ) {
      throw new AppException({
        message: `تاريخ التسليم لا يمكن أن يكون قبل تاريخ مباشرة الموظف (${employee.joined_at})`,
        errorCode: 'HANDOVER_BEFORE_JOINING',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
