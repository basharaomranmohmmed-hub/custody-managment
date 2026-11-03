import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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
  type ItemEntity,
  ITEMS_REPOSITORY,
  type ItemsRepository,
} from '../../items/domain/items.types.js';
import {
  POSSESSIONS_REPOSITORY,
  type PossessionsRepository,
} from '../../possessions/domain/possessions.types.js';
import {
  type IncidentReportEntity,
  type IncidentReportFilters,
  INCIDENT_REPORTS_REPOSITORY,
  type IncidentReportsRepository,
  type UpdateIncidentReportData,
} from '../domain/incident-reports.types.js';
import type { CreateIncidentReportDto } from '../presentation/http/dto/create-incident-report.dto.js';
import type { FilterIncidentReportDto } from '../presentation/http/dto/filter-incident-report.dto.js';
import type { ResolveIncidentReportDto } from '../presentation/http/dto/resolve-incident-report.dto.js';
import type { UpdateIncidentReportDto } from '../presentation/http/dto/update-incident-report.dto.js';

const toInstant = (value?: string) => (value ? new Date(value) : undefined);

@Injectable()
export class IncidentReportsApplicationService {
  constructor(
    @Inject(INCIDENT_REPORTS_REPOSITORY)
    private readonly incidentReportsRepository: IncidentReportsRepository,
    @Inject(ITEMS_REPOSITORY)
    private readonly itemsRepository: ItemsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employeesRepository: EmployeesRepository,
    @Inject(POSSESSIONS_REPOSITORY)
    private readonly possessionsRepository: PossessionsRepository,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreateIncidentReportDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'INCIDENT_REPORT' },
      async () => {
        const item = await this.findItemForUpdateOrFail(dto.item_uuid);
        const employee = await this.findEmployeeOrFail(dto.employee_uuid);
        await this.assertCurrentCustodian(item, employee);

        const created = await this.incidentReportsRepository.create({
          item_id: item.id,
          employee_id: employee.id,
          report_type: dto.report_type,
          description: dto.description,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterIncidentReportDto) {
    const createdFrom = toInstant(filter.created_from);
    const createdTo = toInstant(filter.created_to);
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new AppException({
        message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
        errorCode: 'INVALID_DATE_RANGE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const filters: IncidentReportFilters = {
      report_type: filter.report_type,
      status: filter.status,
      created_from: createdFrom,
      created_to: createdTo,
      search: filter.search,
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

    const { incident_reports, total } =
      await this.incidentReportsRepository.findAll(
        filters,
        resolvePagination(filter),
      );

    return successResponse({ response: { data: incident_reports, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findReportOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateIncidentReportDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'INCIDENT_REPORT' },
      async (target) => {
        const report = await this.findReportOrFail(uuid, { forUpdate: true });
        target.entityId = report.id;

        if (report.status !== 'OPEN') {
          throw new AppException({
            message: 'لا يمكن تعديل بلاغ تمت معالجته',
            errorCode: 'INCIDENT_REPORT_RESOLVED',
            statusCode: HttpStatus.CONFLICT,
          });
        }

        const updateData: UpdateIncidentReportData = {};
        if (
          dto.report_type !== undefined &&
          dto.report_type !== report.report_type
        ) {
          updateData.report_type = dto.report_type;
        }
        if (
          dto.description !== undefined &&
          dto.description !== report.description
        ) {
          updateData.description = dto.description;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: successResponse({ response: report }),
            change: null,
          };
        }

        const updated = await this.incidentReportsRepository.updateById(
          report.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: report.id, before: report, after: updated },
        };
      },
    );
  }

  resolve(
    uuid: string,
    dto: ResolveIncidentReportDto,
    user: AuthenticatedUser,
  ) {
    return this.auditTrail.run(
      { action: 'RESOLVE', entityType: 'INCIDENT_REPORT' },
      async (target) => {
        const report = await this.findReportOrFail(uuid, { forUpdate: true });
        target.entityId = report.id;

        if (report.status !== 'OPEN') {
          throw new AppException({
            message: 'تمت معالجة البلاغ مسبقاً',
            errorCode: 'INCIDENT_REPORT_ALREADY_RESOLVED',
            statusCode: HttpStatus.CONFLICT,
          });
        }

        const resolved = await this.incidentReportsRepository.resolveById(
          report.id,
          {
            resolution: dto.resolution,
            resolved_at: new Date(),
            resolved_by: user.id,
          },
        );

        return {
          result: successResponse({ response: resolved }),
          change: { entityId: report.id, before: report, after: resolved },
        };
      },
    );
  }

  private emptyPage() {
    return successResponse({ response: { data: [], total: 0 } });
  }

  private async findReportOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<IncidentReportEntity> {
    const report = forUpdate
      ? await this.incidentReportsRepository.findByUuidForUpdate(uuid)
      : await this.incidentReportsRepository.findByUuid(uuid);
    if (!report) {
      throw new AppException({
        message: 'البلاغ غير موجود',
        errorCode: 'INCIDENT_REPORT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return report;
  }

  private async findItemForUpdateOrFail(uuid: string): Promise<ItemEntity> {
    const item = await this.itemsRepository.findByUuidForUpdate(uuid);
    if (!item) {
      throw new AppException({
        message: 'المادة غير موجودة',
        errorCode: 'ITEM_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return item;
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

  private async assertCurrentCustodian(
    item: ItemEntity,
    employee: EmployeeEntity,
  ) {
    const openPossession = await this.possessionsRepository.findOpenByItemId(
      item.id,
    );
    if (openPossession?.employee_id !== employee.id) {
      throw new AppException({
        message: `الموظف "${employee.full_name}" لا يحمل المادة "${item.serial_no}" حالياً، ويمكن فقط لحامل العهدة الإبلاغ عنها`,
        errorCode: 'EMPLOYEE_NOT_ITEM_CUSTODIAN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }
}
