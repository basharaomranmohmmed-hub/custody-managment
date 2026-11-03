import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Trim,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';

export class CreateCustodyTypeDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
