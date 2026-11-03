import { IsIn, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trim } from '../../../../../shared/validation/decorators.js';
import {
  INCIDENT_REPORT_TYPES,
  type IncidentReportType,
} from '../../../domain/incident-reports.types.js';

export class CreateIncidentReportDto {
  @IsUUID()
  item_uuid: string;

  @IsUUID()
  employee_uuid: string;

  @IsIn(INCIDENT_REPORT_TYPES)
  report_type: IncidentReportType;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
