import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  PASSWORD_SALT_ROUNDS,
  type UpdateUserData,
  type UserEntity,
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../users/domain/users.types.js';
import { AUTH_CONFIG, type AuthConfig } from '../domain/auth.types.js';
import type { ChangePasswordDto } from '../presentation/http/dto/change-password.dto.js';
import type { LoginDto } from '../presentation/http/dto/login.dto.js';
import type { UpdateProfileDto } from '../presentation/http/dto/update-profile.dto.js';

@Injectable()
export class AuthApplicationService {
  private decoyHash: Promise<string> | null = null;

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH_CONFIG)
    private readonly config: AuthConfig,
    private readonly auditTrail: AuditTrail,
  ) {}

  async login(dto: LoginDto) {
    const credentials = await this.usersRepository.findCredentialsByUsername(
      dto.username,
    );
    const passwordMatches = await bcrypt.compare(
      dto.password,
      credentials?.password_hash ?? (await this.getDecoyHash()),
    );
    if (!credentials || !passwordMatches) {
      throw new AppException({
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
      }
    if (!credentials.is_active) {
      throw new AppException({
        message: 'هذا الحساب غير مفعل',
        errorCode: 'USER_NOT_ACTIVE',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const user = await this.findActiveUserOrFail(credentials.uuid);
    const access_token = await this.jwtService.signAsync({ sub: user.uuid });
    return successResponse({
      response: {
        access_token,
        token_type: 'Bearer' as const,
        expires_in: this.config.accessTokenTtlSeconds,
        user,
      },
        });
  }

  async authenticate(userUuid: string): Promise<AuthenticatedUser> {
    const { id, uuid, username, role, employee_id } =
      await this.findActiveUserOrFail(userUuid);
    return { id, uuid, username, role, employee_id };
  }

  async getProfile(user: AuthenticatedUser) {
    const response = await this.findActiveUserOrFail(user.uuid);
    return successResponse({ response });
  }

  updateProfile(dto: UpdateProfileDto, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'USER', entityId: user.id },
      async () => {
        const target = await this.findActiveUserOrFail(user.uuid);

        const updateData: UpdateUserData = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.phone !== undefined) updateData.phone = dto.phone;

        const updated = await this.usersRepository.updateById(
          target.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: target.id, before: target, after: updated },
        };
      },
    );
  }

  async changePassword(dto: ChangePasswordDto, user: AuthenticatedUser) {
    const password_hash = await bcrypt.hash(
      dto.new_password,
      PASSWORD_SALT_ROUNDS,
    );
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'USER', entityId: user.id },
      async () => {
        const credentials =
          await this.usersRepository.findCredentialsByUsername(user.username);
        if (!credentials) throw unauthenticated();
        const oldPasswordMatches = await bcrypt.compare(
          dto.old_password,
          credentials.password_hash,
        );
        if (!oldPasswordMatches) {
          throw new AppException({
            message: 'كلمة المرور الحالية غير صحيحة',
            errorCode: 'INVALID_OLD_PASSWORD',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        await this.usersRepository.updateById(credentials.id, {
          password_hash,
        });

        return {
          result: successResponse({
            response: { message: 'تم تحديث كلمة المرور بنجاح' },
          }),
          change: {
            entityId: credentials.id,
            before: { password: 'previous' },
            after: { password: 'replaced' },
          },
        };
      },
    );
  }

  private async findActiveUserOrFail(uuid: string): Promise<UserEntity> {
    const user = await this.usersRepository.findByUuid(uuid);
    if (!user || !user.is_active) throw unauthenticated();
    return user;
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= bcrypt.hash(randomUUID(), PASSWORD_SALT_ROUNDS);
    return this.decoyHash;
  }
}

export function unauthenticated() {
  return new AppException({
    message: 'يجب تسجيل الدخول أولاً',
    errorCode: 'UNAUTHENTICATED',
    statusCode: HttpStatus.UNAUTHORIZED,
  });
}
