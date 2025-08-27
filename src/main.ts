import helmet from 'helmet';
import * as morgan from 'morgan';
import { I18nService } from 'nestjs-i18n';
import { I18nHttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/shared/interceptors/response.interceptor';

import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication, NestFactory } from '@nestjs/core';
import { RmqOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'API',
      showHidden: true,
    }),
  });
  const configService = app.get(ConfigService);
  const port =
    (configService.get<number>('PORT', { infer: true }) as number) || 3000;
  app.enableCors();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(morgan('dev'));
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
  const i18nService = app.get(I18nService) as any;
  app.useGlobalInterceptors(new ResponseInterceptor(i18nService));
  app.useGlobalFilters(new I18nHttpExceptionFilter(i18nService));

  app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>('RABBITMQ_URL', { infer: true }) ||
          'amqp://localhost:5672',
      ],
      queue: configService.get<string>('RABBITMQ_QUEUE', { infer: true }),
      noAck: false,
      queueOptions: {
        durable: true,
        // maxPriority: 5,
        // deadLetterExchange: `${configService.get<string>('RABBITMQ_QUEUE', { infer: true })}.amq.dead-letter-exchange`,
        // deadLetterRoutingKey: `${configService.get<string>('RABBITMQ_QUEUE', { infer: true })}.amq.dead-letter-routing-key`,
        // arguments: {
        //   'x-queue-type': 'classic',
        //   'x-queue-mode': 'lazy',
        // },
      },
      prefetchCount: 1,
    },
  });

  await Promise.all([app.startAllMicroservices(), app.listen(port)]);
}
bootstrap();
