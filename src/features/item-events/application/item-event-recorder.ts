import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { currentRequestContext } from '../../../shared/request-context/request-context.js';
import {
  ITEM_EVENTS_REPOSITORY,
  type ItemEventEntity,
  type ItemEventsRepository,
  type RecordItemEventData,
} from '../domain/item-events.types.js';

@Injectable()
export class ItemEventRecorder {
  constructor(
    @Inject(ITEM_EVENTS_REPOSITORY)
    private readonly itemEventsRepository: ItemEventsRepository,
  ) {}

  async record(data: RecordItemEventData): Promise<ItemEventEntity> {
    const latestOccurredAt =
      await this.itemEventsRepository.findLatestOccurredAt(data.item_id);
    if (latestOccurredAt && data.occurred_at < latestOccurredAt) {
      throw new AppException({
        message: `لا يمكن أن تكون الحركة قبل آخر حركة مسجلة على المادة (${latestOccurredAt.toISOString()})`,
        errorCode: 'EVENT_PRECEDES_ITEM_HISTORY',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    return this.itemEventsRepository.create({
      ...data,
      reason: data.reason ?? null,
      report_id: data.report_id ?? null,
      performed_by: currentRequestContext()?.userId ?? null,
    });
  }
}
