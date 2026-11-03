import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/pagination.js';
import {
  IsDateTimeWithZone,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import {
  DOCUMENT_TYPES,
  type DocumentType,
} from '../../../domain/documents.types.js';

export class FilterDocumentDto extends PaginationQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  employee_uuid?: string;

  @IsOptional()
  @IsUUID()
  item_uuid?: string;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  doc_type?: DocumentType;

  @IsOptional()
  @IsUUID()
  issued_by_uuid?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  issued_from?: string;

  @IsOptional()
  @IsDateTimeWithZone()
  issued_to?: string;
}
