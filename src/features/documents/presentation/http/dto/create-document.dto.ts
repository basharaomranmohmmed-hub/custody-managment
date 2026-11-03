import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  IsDateTimeWithZone,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import {
  DOCUMENT_TYPES,
  type DocumentType,
} from '../../../domain/documents.types.js';

export class CreateDocumentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  doc_no: string;

  @IsIn(DOCUMENT_TYPES)
  doc_type: DocumentType;

  @IsUUID()
  employee_uuid: string;

  @IsOptional()
  @IsDateTimeWithZone()
  issued_at?: string;

  @IsOptional()
  @IsUUID()
  issued_by_uuid?: string;
}
