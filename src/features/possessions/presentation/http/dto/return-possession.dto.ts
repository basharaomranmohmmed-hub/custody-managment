import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  IsDateTimeWithZone,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';
import {
  ITEM_TECH_CONDITIONS,
  type ItemTechCondition,
} from '../../../../items/domain/items.types.js';

export class ReturnPossessionDto {
  @IsOptional()
  @IsDateTimeWithZone()
  ended_at?: string;

  @IsIn(ITEM_TECH_CONDITIONS)
  condition_at_end: ItemTechCondition;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  end_reason?: string | null;
}
