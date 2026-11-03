import { PartialType } from '@nestjs/mapped-types';
import { CreateCustodyTypeDto } from './create-custody-type.dto.js';

export class UpdateCustodyTypeDto extends PartialType(CreateCustodyTypeDto, {
  skipNullProperties: false,
}) {}
