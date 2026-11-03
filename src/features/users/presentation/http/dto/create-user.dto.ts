import {
  IsByteLength,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ToLowerCase,
  Trim,
  TrimToNull,
} from '../../../../../shared/validation/decorators.js';
import {
  ASSIGNABLE_USER_ROLES,
  type AssignableUserRole,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../../../domain/users.types.js';

export class CreateUserDto {
  @Trim()
  @ToLowerCase()
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'username must be 3-50 characters of letters, digits, dots, underscores or hyphens, starting and ending with a letter or digit',
  })
  username: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @IsByteLength(0, PASSWORD_MAX_BYTES, {
    message: `password must be at most ${PASSWORD_MAX_BYTES} bytes`,
  })
  password: string;

  @IsIn(ASSIGNABLE_USER_ROLES)
  role: AssignableUserRole;

  @IsOptional()
  @IsUUID()
  employee_uuid?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  name?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'phone may only contain digits, spaces, +, - and parentheses',
  })
  phone?: string | null;
}
