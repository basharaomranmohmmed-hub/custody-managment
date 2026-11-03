import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../../shared/auth/authenticated-user.js';
import { ROLES_KEY } from '../../../../shared/auth/roles.decorator.js';
import type { UserRole } from '../../../../shared/auth/user-role.js';
import { AppException } from '../../../../shared/exceptions/app.exception.js';
import { unauthenticated } from '../../application/auth.application.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowed?.length) {
      this.logger.error(
        `${context.getClass().name}.${context.getHandler().name} does not declare @Roles`,
      );
      throw new AppException({
        message: 'هذه العملية لا تحدد الأدوار المسموح لها',
        errorCode: 'ROLES_NOT_DECLARED',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return assertRole(context, allowed);
  }
}

export function assertRole(
  context: ExecutionContext,
  allowed: readonly UserRole[],
): true {
  const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!user) throw unauthenticated();
  if (!allowed.includes(user.role)) {
    throw new AppException({
      message: 'دورك لا يسمح بتنفيذ هذه العملية',
      errorCode: 'ROLE_NOT_ALLOWED',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
  return true;
}
