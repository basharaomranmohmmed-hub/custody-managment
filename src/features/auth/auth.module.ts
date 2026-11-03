import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthApplicationService } from './application/auth.application.service.js';
import { AUTH_CONFIG } from './domain/auth.types.js';
import { JWT_ALGORITHM, loadAuthConfig } from './infrastructure/auth.config.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { JwtStrategy } from './presentation/strategies/jwt.strategy.js';

const LOGIN_ATTEMPTS_WINDOW_MS = 60_000;

@Global()
@Module({
  imports: [
    UsersModule,
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const { jwtSecret, accessTokenTtlSeconds } = loadAuthConfig();
        return {
          secret: jwtSecret,
          signOptions: {
            algorithm: JWT_ALGORITHM,
            expiresIn: accessTokenTtlSeconds,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: LOGIN_ATTEMPTS_WINDOW_MS,
            limit: loadAuthConfig().loginAttemptsPerMinute,
          },
        ],
        errorMessage: 'محاولات تسجيل دخول كثيرة، حاول مجدداً بعد دقيقة',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthApplicationService,
    JwtStrategy,
    { provide: AUTH_CONFIG, useFactory: () => loadAuthConfig() },
  ],
  exports: [AuthApplicationService, JwtModule],
})
export class AuthModule {}
