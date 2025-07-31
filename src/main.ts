import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as morgan from 'morgan';
import { I18nService } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { I18nHttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port =
    (configService.get<number>('PORT', { infer: true }) as number) || 3000;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(morgan('dev'));

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
