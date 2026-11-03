import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import {
  IsDateTimeWithZone,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import {
  INCIDENT_REPORT_STATUSES,
  INCIDENT_REPORT_TYPES,
  type IncidentReportStatus,
  type IncidentReportType,
} from '../../../domain/incident-reports.types.js';

export class FilterIncidentReportDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  item_uuid?: string;

  @IsOptional()
  @IsUUID()
  employee_uuid?: string;

  @IsOptional()
  @IsIn(INCIDENT_REPORT_TYPES)
  report_type?: IncidentReportType;

  @IsOptional()
  @IsIn(INCIDENT_REPORT_STATUSES)
  status?: IncidentReportStatus;

  @IsOptional()
  @IsDateTimeWithZone()
  created_from?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  created_to?: string;
}
