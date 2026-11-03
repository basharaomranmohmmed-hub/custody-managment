import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import {
  ToBoolean,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import {
  ASSIGNABLE_USER_ROLES,
  type AssignableUserRole,
} from '../../../domain/users.types.js';

export class FilterUserDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  search?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_USER_ROLES)
  role?: AssignableUserRole;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  is_active?: boolean;
}
