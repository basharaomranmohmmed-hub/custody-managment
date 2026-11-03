import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import { Trim } from '../../../../../shared/validation/decorators.js';
import {
  ITEM_OP_STATUSES,
  ITEM_TECH_CONDITIONS,
  type ItemOpStatus,
  type ItemTechCondition,
} from '../../../domain/items.types.js';

export class FilterItemDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  custody_type_uuid?: string;

  @IsOptional()
  @IsIn(ITEM_OP_STATUSES)
  op_status?: ItemOpStatus;

  @IsOptional()
  @IsIn(ITEM_TECH_CONDITIONS)
  tech_condition?: ItemTechCondition;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  model?: string;
}
