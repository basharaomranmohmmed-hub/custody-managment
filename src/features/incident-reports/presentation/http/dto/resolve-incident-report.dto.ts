import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../../../shared/validation/decorators.js';

export class ResolveIncidentReportDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution: string;
}
