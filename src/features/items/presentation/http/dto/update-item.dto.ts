import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateItemDto } from './create-item.dto.js';

export class UpdateItemDto extends PartialType(
  OmitType(CreateItemDto, [
    'op_status',
    'tech_condition',
    'opening_balance',
  ] as const),
  { skipNullProperties: false },
) {}
