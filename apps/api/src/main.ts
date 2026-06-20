import 'reflect-metadata';

import { parseApiEnvironment } from '@buzzytrip/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const environment = parseApiEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.listen(environment.PORT, '0.0.0.0');
}

void bootstrap();
