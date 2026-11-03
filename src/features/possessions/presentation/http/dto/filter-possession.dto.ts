import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import { IsDateTimeWithZone } from '../../../../../shared/validation/decorators.js';
import {
  POSSESSION_STATUSES,
  type PossessionStatus,
} from '../../../domain/possessions.types.js';

export class FilterPossessionDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  item_uuid?: string;

  @IsOptional()
  @IsUUID()
  employee_uuid?: string;

  @IsOptional()
  @IsUUID()
  department_uuid?: string;

  @IsOptional()
  @IsIn(POSSESSION_STATUSES)
  status?: PossessionStatus;

  @IsOptional()
  @IsDateTimeWithZone()
  started_from?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  started_to?: string;
}
