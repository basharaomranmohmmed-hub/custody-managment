import type { AuthConfig } from '../domain/auth.types.js';

export const JWT_ALGORITHM = 'HS256';

export const MIN_JWT_SECRET_LENGTH = 32;

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;

export const DEFAULT_LOGIN_ATTEMPTS_PER_MINUTE = 10;

export function loadAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const jwtSecret = env.JWT_SECRET ?? '';
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to at least ${MIN_JWT_SECRET_LENGTH} characters`,
    );
  }

  const accessTokenTtlSeconds = positiveWholeNumber(
    env.JWT_EXPIRES_IN_SECONDS,
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    'JWT_EXPIRES_IN_SECONDS must be a positive whole number of seconds',
  );
  const loginAttemptsPerMinute = positiveWholeNumber(
    env.LOGIN_ATTEMPTS_PER_MINUTE,
    DEFAULT_LOGIN_ATTEMPTS_PER_MINUTE,
    'LOGIN_ATTEMPTS_PER_MINUTE must be a positive whole number',
  );

  return { jwtSecret, accessTokenTtlSeconds, loginAttemptsPerMinute };
}

function positiveWholeNumber(
  value: string | undefined,
  fallback: number,
  errorMessage: string,
): number {
  const number = value ? Number(value) : fallback;
  if (!Number.isInteger(number) || number <= 0) throw new Error(errorMessage);
  return number;
}
