import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import { Trim } from '../../../../../shared/validation/decorators.js';
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from '../../../domain/employees.types.js';

export class FilterEmployeeDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  department_uuid?: string;

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: EmployeeStatus;
}
