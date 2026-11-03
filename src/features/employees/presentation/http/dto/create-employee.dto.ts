import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsDateOnly,
  Trim,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';

export class CreateEmployeeDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employee_no: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  full_name: string;

  @IsUUID()
  department_uuid: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(150)
  job_title?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'phone may only contain digits, spaces, +, - and parentheses',
  })
  phone?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @IsDateOnly()
  joined_at?: string | null;
}
