import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument, observeEnabled } from './app.module.js';
import { configureApp } from './shared/http/configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: observeEnabled ? ObserveInstrument : undefined,
  });
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
