import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';

export class ResetUserPasswordDto extends PickType(CreateUserDto, [
  'password',
]) {}
