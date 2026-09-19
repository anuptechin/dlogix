import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProd = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProd && (!sessionSecret || sessionSecret.length < 16)) {
    throw new Error('SESSION_SECRET must be set (>=16 chars) in production.');
  }
  // Signed cookies → the session cookie cannot be forged without the secret.
  app.use(cookieParser(sessionSecret ?? 'dev-insecure-secret-change-me'));

  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim());
  if (isProd && !corsOrigin) {
    throw new Error('CORS_ORIGIN must be set in production (e.g. https://dlogix.ddecor.com).');
  }
  // With credentialed cookies, only reflect explicitly-allowed origins.
  app.enableCors({ origin: corsOrigin ?? true, credentials: true });

  app.setGlobalPrefix('', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(process.env.API_PORT ?? 3093);
  await app.listen(port, '0.0.0.0');
  Logger.log(`LPRMS API listening on :${port}`, 'Bootstrap');
}

bootstrap();
