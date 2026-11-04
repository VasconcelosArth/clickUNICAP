import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppConfig } from '@/core/config';
import { AppModule } from './app.module';

/** Configuração comum ao servidor real e aos testes e2e. */
export function configureApp(app: INestApplication) {
  const config = app.get(AppConfig);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const port = app.get(AppConfig).port;
  await app.listen(port);
  process.stdout.write(`API rodando em http://localhost:${port}/api\n`);
}

if (require.main === module) {
  void bootstrap();
}
