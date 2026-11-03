import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import {
  ToBoolean,
  Trim,
} from '../../../../../shared/validation/decorators.js';

export class FilterDepartmentDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  is_active?: boolean;
}
