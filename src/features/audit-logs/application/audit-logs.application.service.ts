import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import {
  AUDIT_LOGS_REPOSITORY,
  type AuditEntityType,
  type AuditLogsRepository,
} from '../domain/audit-logs.types.js';
import type { FilterAuditLogDto } from '../presentation/http/dto/filter-audit-log.dto.js';

const toInstant = (value?: string) => (value ? new Date(value) : undefined);

const ENTITY_NOT_FOUND_MESSAGES: Record<AuditEntityType, string> = {
  DEPARTMENT: 'القسم غير موجود',
  EMPLOYEE: 'الموظف غير موجود',
  CUSTODY_TYPE: 'نوع العهدة غير موجود',
  ITEM: 'المادة غير موجودة',
  POSSESSION: 'العهدة غير موجودة',
  INCIDENT_REPORT: 'البلاغ غير موجود',
  DOCUMENT: 'الوثيقة غير موجودة',
  USER: 'المستخدم غير موجود',
  ROLE: 'الدور غير موجود',
  PERMISSION: 'الصلاحية غير موجودة',
};

@Injectable()
export class AuditLogsApplicationService {
  constructor(
    @Inject(AUDIT_LOGS_REPOSITORY)
    private readonly auditLogsRepository: AuditLogsRepository,
  ) {}

  async findAll(filter: FilterAuditLogDto) {
    const userId = filter.user_uuid
      ? await this.resolveEntityId('USER', filter.user_uuid)
      : undefined;
    const entityId =
      filter.entity_type && filter.entity_uuid
        ? await this.resolveEntityId(filter.entity_type, filter.entity_uuid)
        : undefined;

    const createdFrom = toInstant(filter.created_from);
    const createdTo = toInstant(filter.created_to);
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new AppException({
        message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
        errorCode: 'INVALID_DATE_RANGE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const { audit_logs, total } = await this.auditLogsRepository.findAll(
      {
        user_id: userId,
        action: filter.action,
        entity_type: filter.entity_type,
        entity_id: entityId,
        outcome: filter.outcome,
        error_code: filter.error_code,
        created_from: createdFrom,
        created_to: createdTo,
      },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: audit_logs, total } });
  }

  async findOne(uuid: string) {
    const response = await this.auditLogsRepository.findByUuid(uuid);
    if (!response) {
      throw new AppException({
        message: 'سجل التدقيق غير موجود',
        errorCode: 'AUDIT_LOG_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return successResponse({ response });
  }

  private async resolveEntityId(
    entityType: AuditEntityType,
    uuid: string,
  ): Promise<number> {
    const id = await this.auditLogsRepository.findEntityId(entityType, uuid);
    if (id === null) {
      throw new AppException({
        message: ENTITY_NOT_FOUND_MESSAGES[entityType],
        errorCode: `${entityType}_NOT_FOUND`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return id;
  }
}
