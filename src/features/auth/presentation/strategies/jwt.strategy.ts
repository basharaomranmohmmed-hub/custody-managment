import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import {
  AuthApplicationService,
  unauthenticated,
} from '../../application/auth.application.service.js';
import { AUTH_CONFIG, type AuthConfig } from '../../domain/auth.types.js';
import { JWT_ALGORITHM } from '../../infrastructure/auth.config.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(AUTH_CONFIG) config: AuthConfig,
    private readonly authApplicationService: AuthApplicationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtSecret,
      algorithms: [JWT_ALGORITHM],
    });
  }

  async validate(payload: { sub?: unknown }): Promise<AuthenticatedUser> {
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw unauthenticated();
    }
    return this.authApplicationService.authenticate(payload.sub);
  }
}
