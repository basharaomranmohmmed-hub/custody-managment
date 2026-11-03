import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  CUSTODY_TYPES_REPOSITORY,
  type CustodyTypeEntity,
  type CustodyTypesRepository,
  type UpdateCustodyTypeData,
} from '../domain/custody-types.types.js';
import type { CreateCustodyTypeDto } from '../presentation/http/dto/create-custody-type.dto.js';
import type { FilterCustodyTypeDto } from '../presentation/http/dto/filter-custody-type.dto.js';
import type { UpdateCustodyTypeStatusDto } from '../presentation/http/dto/update-custody-type-status.dto.js';
import type { UpdateCustodyTypeDto } from '../presentation/http/dto/update-custody-type.dto.js';

@Injectable()
export class CustodyTypesApplicationService {
  constructor(
    @Inject(CUSTODY_TYPES_REPOSITORY)
    private readonly custodyTypesRepository: CustodyTypesRepository,
    private readonly auditTrail: AuditTrail,
  ) {}

  create(dto: CreateCustodyTypeDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'CREATE', entityType: 'CUSTODY_TYPE' },
      async () => {
        await this.assertNameAvailable(dto.name);

        const created = await this.custodyTypesRepository.create({
          name: dto.name,
          description: dto.description ?? null,
          created_by: user.id,
        });

        return {
          result: successResponse({ response: created }),
          change: { entityId: created.id, after: created },
        };
      },
    );
  }

  async findAll(filter: FilterCustodyTypeDto) {
    const { custody_types, total } = await this.custodyTypesRepository.findAll(
      { is_active: filter.is_active, search: filter.search },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: custody_types, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findCustodyTypeOrFail(uuid);
    return successResponse({ response });
  }

  update(uuid: string, dto: UpdateCustodyTypeDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'CUSTODY_TYPE' },
      async (target) => {
        const custodyType = await this.findCustodyTypeOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = custodyType.id;

        const updateData: UpdateCustodyTypeData = {};
        if (dto.name !== undefined && dto.name !== custodyType.name) {
          await this.assertNameAvailable(dto.name, custodyType.id);
          updateData.name = dto.name;
        }
        if (
          dto.description !== undefined &&
          dto.description !== custodyType.description
        ) {
          updateData.description = dto.description;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: successResponse({ response: custodyType }),
            change: null,
          };
        }

        const updated = await this.custodyTypesRepository.updateById(
          custodyType.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: {
            entityId: custodyType.id,
            before: custodyType,
            after: updated,
          },
        };
      },
    );
  }

  updateActiveStatus(uuid: string, dto: UpdateCustodyTypeStatusDto) {
    return this.auditTrail.run(
      { action: 'STATUS_CHANGE', entityType: 'CUSTODY_TYPE' },
      async (target) => {
        const custodyType = await this.findCustodyTypeOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = custodyType.id;

        if (custodyType.is_active === dto.is_active) {
          return {
            result: successResponse({ response: custodyType }),
            change: null,
          };
        }

        const updated = await this.custodyTypesRepository.updateById(
          custodyType.id,
          { is_active: dto.is_active },
        );

        return {
          result: successResponse({ response: updated }),
          change: {
            entityId: custodyType.id,
            before: custodyType,
            after: updated,
          },
        };
      },
    );
  }

  private async findCustodyTypeOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<CustodyTypeEntity> {
    const custodyType = forUpdate
      ? await this.custodyTypesRepository.findByUuidForUpdate(uuid)
      : await this.custodyTypesRepository.findByUuid(uuid);
    if (!custodyType) {
      throw new AppException({
        message: 'نوع العهدة غير موجود',
        errorCode: 'CUSTODY_TYPE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return custodyType;
  }

  private async assertNameAvailable(name: string, excludeId?: number) {
    const existing = await this.custodyTypesRepository.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new AppException({
        message: `يوجد نوع عهدة بنفس الاسم "${existing.name}"`,
        errorCode: 'CUSTODY_TYPE_NAME_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }
}
