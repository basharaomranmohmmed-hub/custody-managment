import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto.js';

export class UpdateDocumentDto extends PartialType(
  OmitType(CreateDocumentDto, ['employee_uuid'] as const),
  { skipNullProperties: false },
) {}
