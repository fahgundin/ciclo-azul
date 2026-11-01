import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Bootstrap da aplicacao.
 * CORS e restrito a origem da aplicacao web (ver docs/arquitetura.md, seguranca).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const allowedOrigin = process.env.WEB_APP_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: allowedOrigin, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
