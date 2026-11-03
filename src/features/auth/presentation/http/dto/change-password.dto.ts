import {
  IsByteLength,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../../users/domain/users.types.js';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  old_password: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @IsByteLength(0, PASSWORD_MAX_BYTES, {
    message: `new_password must be at most ${PASSWORD_MAX_BYTES} bytes`,
  })
  new_password: string;
}
