import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateIncidentReportDto } from './create-incident-report.dto.js';

export class UpdateIncidentReportDto extends PartialType(
  OmitType(CreateIncidentReportDto, ['item_uuid', 'employee_uuid'] as const),
  { skipNullProperties: false },
) {}
