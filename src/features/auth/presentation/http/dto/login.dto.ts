import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  ToLowerCase,
  Trim,
} from '../../../../../shared/validation/decorators.js';
import { PASSWORD_MAX_LENGTH } from '../../../../users/domain/users.types.js';

export class LoginDto {
  @Trim()
  @ToLowerCase()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
