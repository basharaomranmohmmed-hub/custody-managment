import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import {
  type IsoDate,
  latestPossibleToday,
} from '../../../shared/date/date-only.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  CUSTODY_TYPES_REPOSITORY,
  type CustodyTypeEntity,
  type CustodyTypesRepository,
} from '../../custody-types/domain/custody-types.types.js';
import {
  type IncidentReportEntity,
  INCIDENT_REPORTS_REPOSITORY,
  type IncidentReportsRepository,
} from '../../incident-reports/domain/incident-reports.types.js';
import { ItemEventRecorder } from '../../item-events/application/item-event-recorder.js';
import {
  type ItemEntity,
  ITEMS_REPOSITORY,
  type ItemsRepository,
  type UpdateItemData,
} from '../domain/items.types.js';
import type { CreateItemDto } from '../presentation/http/dto/create-item.dto.js';
import type { FilterItemDto } from '../presentation/http/dto/filter-item.dto.js';
import type { UpdateItemStatusDto } from '../presentation/http/dto/update-item-status.dto.js';
import type { UpdateItemDto } from '../presentation/http/dto/update-item.dto.js';

@Injectable()
export class ItemsApplicationService {
  constructor(
    @Inject(ITEMS_REPOSITORY)
    private readonly itemsRepository: ItemsRepository,
    @Inject(CUSTODY_TYPES_REPOSITORY)
    private readonly custodyTypesRepository: CustodyTypesRepository,
    @Inject(INCIDENT_REPORTS_REPOSITORY)
    private readonly incidentReportsRepository: IncidentReportsRepository,
    private readonly itemEventRecorder: ItemEventRecorder,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreateItemDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'ITEM' },
      async () => {
        const custodyType = await this.findCustodyTypeOrFail(
          dto.custody_type_uuid,
        );
        this.assertPurchaseDateNotInFuture(dto.purchase_date);
        this.assertCustodyTypeActive(custodyType);
        await this.assertSerialNoAvailable(dto.serial_no);

        const created = await this.itemsRepository.create({
          serial_no: dto.serial_no,
          custody_type_id: custodyType.id,
          brand: dto.brand ?? null,
          model: dto.model ?? null,
          purchase_date: dto.purchase_date ?? null,
          op_status: dto.op_status,
          tech_condition: dto.tech_condition,
          opening_balance: dto.opening_balance ?? false,
          notes: dto.notes ?? null,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterItemDto) {
    let custodyTypeId: number | undefined;
    if (filter.custody_type_uuid !== undefined) {
      const custodyType = await this.custodyTypesRepository.findByUuid(
        filter.custody_type_uuid,
      );
      if (!custodyType) {
        return successResponse({ response: { data: [], total: 0 } });
      }
      custodyTypeId = custodyType.id;
    }

    const { items, total } = await this.itemsRepository.findAll(
      {
        custody_type_id: custodyTypeId,
        op_status: filter.op_status,
        tech_condition: filter.tech_condition,
        brand: filter.brand,
        model: filter.model,
        search: filter.search,
      },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: items, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findItemOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateItemDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'ITEM' },
      async (target) => {
        const custodyType =
          dto.custody_type_uuid !== undefined
            ? await this.findCustodyTypeOrFail(dto.custody_type_uuid)
            : null;
        const item = await this.findItemOrFail(uuid, { forUpdate: true });
        target.entityId = item.id;

        this.assertPurchaseDateNotInFuture(dto.purchase_date);

        const updateData: UpdateItemData = {};
        if (dto.serial_no !== undefined && dto.serial_no !== item.serial_no) {
          await this.assertSerialNoAvailable(dto.serial_no, item.id);
          updateData.serial_no = dto.serial_no;
        }
        if (custodyType && custodyType.id !== item.custody_type_id) {
          this.assertCustodyTypeActive(custodyType);
          updateData.custody_type_id = custodyType.id;
        }
        if (dto.brand !== undefined && dto.brand !== item.brand) {
          updateData.brand = dto.brand;
        }
        if (dto.model !== undefined && dto.model !== item.model) {
          updateData.model = dto.model;
        }
        if (
          dto.purchase_date !== undefined &&
          dto.purchase_date !== item.purchase_date
        ) {
          updateData.purchase_date = dto.purchase_date;
        }
        if (dto.notes !== undefined && dto.notes !== item.notes) {
          updateData.notes = dto.notes;
        }

        if (Object.keys(updateData).length === 0) {
          return { result: successResponse({ response: item }), change: null };
        }

        const updated = await this.itemsRepository.updateById(
          item.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: item.id, before: item, after: updated },
        };
      },
    );
  }

  updateStatus(uuid: string, dto: UpdateItemStatusDto) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'ITEM' },
      async (target) => {
        const item = await this.findItemOrFail(uuid, { forUpdate: true });
        target.entityId = item.id;

        if (dto.op_status === undefined && dto.tech_condition === undefined) {
          throw new AppException({
            message: 'يجب تحديد الحالة التشغيلية أو الحالة الفنية أو كليهما',
            errorCode: 'ITEM_STATUS_REQUIRED',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        const report =
          dto.report_uuid !== undefined
            ? await this.findReportOfItemOrFail(dto.report_uuid, item.id)
            : null;

        const next = {
          op_status: dto.op_status ?? item.op_status,
          tech_condition: dto.tech_condition ?? item.tech_condition,
        };
        if (
          next.op_status === item.op_status &&
          next.tech_condition === item.tech_condition
        ) {
          return { result: successResponse({ response: item }), change: null };
        }
        if (next.op_status !== item.op_status) {
          this.assertItemNotRetired(item);
          await this.assertItemNotHeld(item);
        }

        await this.itemEventRecorder.record({
          item_id: item.id,
          event_type: 'STATUS_CHANGE',
          op_status_before: item.op_status,
          op_status_after: next.op_status,
          condition_before: item.tech_condition,
          condition_after: next.tech_condition,
          reason: dto.reason ?? null,
          occurred_at: new Date(),
          report_id: report?.id ?? null,
        });
        const updated = await this.itemsRepository.updateById(item.id, next);

        return {
          result: successResponse({ response: updated }),
          change: { entityId: item.id, before: item, after: updated },
        };
      },
    );
  }

  private async findItemOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<ItemEntity> {
    const item = forUpdate
      ? await this.itemsRepository.findByUuidForUpdate(uuid)
      : await this.itemsRepository.findByUuid(uuid);
    if (!item) {
      throw new AppException({
        message: 'المادة غير موجودة',
        errorCode: 'ITEM_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return item;
  }

  private async findCustodyTypeOrFail(
    uuid: string,
  ): Promise<CustodyTypeEntity> {
    const custodyType = await this.custodyTypesRepository.findByUuid(uuid);
    if (!custodyType) {
      throw new AppException({
        message: 'نوع العهدة غير موجود',
        errorCode: 'CUSTODY_TYPE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return custodyType;
  }

  private async findReportOfItemOrFail(
    uuid: string,
    itemId: number,
  ): Promise<IncidentReportEntity> {
    const report = await this.incidentReportsRepository.findByUuid(uuid);
    if (!report) {
      throw new AppException({
        message: 'البلاغ غير موجود',
        errorCode: 'INCIDENT_REPORT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (report.item_id !== itemId) {
      throw new AppException({
        message: 'البلاغ لا يخص هذه المادة',
        errorCode: 'INCIDENT_REPORT_ITEM_MISMATCH',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return report;
  }

  private assertCustodyTypeActive(custodyType: CustodyTypeEntity) {
    if (!custodyType.is_active) {
      throw new AppException({
        message: `نوع العهدة "${custodyType.name}" معطل ولا يمكن إضافة مواد إليه`,
        errorCode: 'CUSTODY_TYPE_INACTIVE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertSerialNoAvailable(serialNo: string, excludeId?: number) {
    const existing = await this.itemsRepository.findBySerialNo(serialNo);
    if (existing && existing.id !== excludeId) {
      throw new AppException({
        message: `الرقم التسلسلي "${existing.serial_no}" مسجل مسبقاً`,
        errorCode: 'SERIAL_NO_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private assertItemNotRetired(item: ItemEntity) {
    if (item.op_status === 'RETIRED') {
      throw new AppException({
        message: `المادة "${item.serial_no}" متقاعدة ولا يمكن تغيير حالتها التشغيلية`,
        errorCode: 'ITEM_RETIRED',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertItemNotHeld(item: ItemEntity) {
    const openPossessions = await this.itemsRepository.countOpenPossessions(
      item.id,
    );
    if (openPossessions > 0) {
      throw new AppException({
        message: `لا يمكن تغيير الحالة التشغيلية للمادة "${item.serial_no}" وهي في عهدة موظف، يجب استلامها أولاً`,
        errorCode: 'ITEM_HELD_BY_EMPLOYEE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private assertPurchaseDateNotInFuture(
    purchaseDate: IsoDate | null | undefined,
  ) {
    if (purchaseDate && purchaseDate > latestPossibleToday()) {
      throw new AppException({
        message: 'تاريخ الشراء لا يمكن أن يكون في المستقبل',
        errorCode: 'INVALID_PURCHASE_DATE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
