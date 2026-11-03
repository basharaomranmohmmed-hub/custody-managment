import { PickType } from '@nestjs/mapped-types';
import { UpdateUserDto } from '../../../../users/presentation/http/dto/update-user.dto.js';

export class UpdateProfileDto extends PickType(UpdateUserDto, [
  'name',
  'email',
  'phone',
] as const) {}
