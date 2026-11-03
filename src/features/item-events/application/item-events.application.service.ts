import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import {
  ITEM_EVENTS_REPOSITORY,
  type ItemEventsRepository,
} from '../domain/item-events.types.js';
import type { FilterItemEventDto } from '../presentation/http/dto/filter-item-event.dto.js';

const toInstant = (value?: string) => (value ? new Date(value) : undefined);

@Injectable()
export class ItemEventsApplicationService {
  constructor(
    @Inject(ITEM_EVENTS_REPOSITORY)
    private readonly itemEventsRepository: ItemEventsRepository,
  ) {}

  async findAll(filter: FilterItemEventDto) {
    const occurredFrom = toInstant(filter.occurred_from);
    const occurredTo = toInstant(filter.occurred_to);
    if (occurredFrom && occurredTo && occurredFrom > occurredTo) {
      throw new AppException({
        message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
        errorCode: 'INVALID_DATE_RANGE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const { item_events, total } = await this.itemEventsRepository.findAll(
      {
        item_uuid: filter.item_uuid,
        event_type: filter.event_type,
        occurred_from: occurredFrom,
        occurred_to: occurredTo,
      },
      resolvePagination(filter),
    );

    return successResponse({ response: { data: item_events, total } });
  }

  async findOne(uuid: string) {
    const response = await this.itemEventsRepository.findByUuid(uuid);
    if (!response) {
      throw new AppException({
        message: 'حركة العهدة غير موجودة',
        errorCode: 'ITEM_EVENT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return successResponse({ response });
  }
}
