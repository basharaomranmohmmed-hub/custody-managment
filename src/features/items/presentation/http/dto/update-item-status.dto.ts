import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TrimToNull } from '../../../../../shared/validation/decorators.js';
import {
  ITEM_OP_STATUSES,
  ITEM_TECH_CONDITIONS,
  type ItemOpStatus,
  type ItemTechCondition,
} from '../../../domain/items.types.js';

export class UpdateItemStatusDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ITEM_OP_STATUSES)
  op_status?: ItemOpStatus;

  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ITEM_TECH_CONDITIONS)
  tech_condition?: ItemTechCondition;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;

  @IsOptional()
  @IsUUID()
  report_uuid?: string;
}
