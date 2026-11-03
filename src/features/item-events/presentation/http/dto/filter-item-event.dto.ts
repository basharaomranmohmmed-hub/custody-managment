import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import { IsDateTimeWithZone } from '../../../../../shared/validation/decorators.js';
import {
  ITEM_EVENT_TYPES,
  type ItemEventType,
} from '../../../domain/item-events.types.js';

export class FilterItemEventDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  item_uuid?: string;

  @IsOptional()
  @IsIn(ITEM_EVENT_TYPES)
  event_type?: ItemEventType;

  @IsOptional()
  @IsDateTimeWithZone()
  occurred_from?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  occurred_to?: string;
}
