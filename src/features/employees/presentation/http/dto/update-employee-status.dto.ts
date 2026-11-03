import { IsIn, IsOptional } from 'class-validator';
import { IsDateOnly } from '../../../../../shared/validation/decorators.js';
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from '../../../domain/employees.types.js';

export class UpdateEmployeeStatusDto {
  @IsIn(EMPLOYEE_STATUSES)
  status: EmployeeStatus;

  @IsOptional()
  @IsDateOnly()
  terminated_at?: string | null;
}
