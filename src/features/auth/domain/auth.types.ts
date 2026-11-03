export interface AuthConfig {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  loginAttemptsPerMinute: number;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
