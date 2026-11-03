import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import {
  IsDateTimeWithZone,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_OUTCOMES,
  type AuditAction,
  type AuditEntityType,
  type AuditOutcome,
} from '../../../domain/audit-logs.types.js';

export class FilterAuditLogDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  user_uuid?: string;

  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;

  @ValidateIf(
    (filter: FilterAuditLogDto) =>
      filter.entity_type !== undefined || filter.entity_uuid !== undefined,
  )
  @IsIn(AUDIT_ENTITY_TYPES)
  entity_type?: AuditEntityType;

  @IsOptional()
  @IsUUID()
  entity_uuid?: string;

  @IsOptional()
  @IsIn(AUDIT_OUTCOMES)
  outcome?: AuditOutcome;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  error_code?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  created_from?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  created_to?: string;
}
