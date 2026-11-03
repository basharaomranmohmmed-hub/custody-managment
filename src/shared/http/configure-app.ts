import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../filters/http-exception.filter.js';
import { RequestContextInterceptor } from './request-context.interceptor.js';

export function configureApp(
  app: INestApplication,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const trustProxyHops = parseTrustProxyHops(env.TRUST_PROXY_HOPS);
  if (trustProxyHops !== null) {
    const server: Express = app.getHttpAdapter().getInstance();
    server.set('trust proxy', trustProxyHops);
  }

  app.use(helmet());

  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
  if (corsOrigins.length > 0) app.enableCors({ origin: corsOrigins });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new RequestContextInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
}

function parseTrustProxyHops(value: string | undefined): number | null {
  if (!value) return null;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops <= 0) {
    throw new Error('TRUST_PROXY_HOPS must be a positive whole number');
  }
  return hops;
}

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
