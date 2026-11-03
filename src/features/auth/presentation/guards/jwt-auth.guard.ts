import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { unauthenticated } from '../../application/auth.application.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    error: unknown,
    user: TUser | false,
  ): TUser {
    if (error) throw error;
    if (!user) throw unauthenticated();
    return user;
  }
}
