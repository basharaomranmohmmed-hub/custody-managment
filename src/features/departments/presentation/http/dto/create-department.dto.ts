import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../../../shared/validation/decorators.js';

export class CreateDepartmentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;
}
