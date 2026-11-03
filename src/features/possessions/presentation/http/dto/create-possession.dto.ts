import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  IsDateOnly,
  IsDateTimeWithZone,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';

export class CreatePossessionDto {
  @IsUUID()
  item_uuid: string;

  @IsUUID()
  employee_uuid: string;

  @IsOptional()
  @IsDateTimeWithZone()
  started_at?: string;

  @IsOptional()
  @IsDateOnly()
  due_date?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  accessories?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
