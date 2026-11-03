import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  IsDateOnly,
  Trim,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';
import {
  ITEM_OP_STATUSES,
  ITEM_TECH_CONDITIONS,
  type ItemOpStatus,
  type ItemTechCondition,
} from '../../../domain/items.types.js';

export class CreateItemDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serial_no: string;

  @IsUUID()
  custody_type_uuid: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  brand?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  model?: string | null;

  @IsOptional()
  @IsDateOnly()
  purchase_date?: string | null;

  @IsIn(ITEM_OP_STATUSES)
  op_status: ItemOpStatus;

  @IsIn(ITEM_TECH_CONDITIONS)
  tech_condition: ItemTechCondition;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  opening_balance?: boolean;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
