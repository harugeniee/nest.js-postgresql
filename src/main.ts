import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Transport, RmqOptions } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port =
    (configService.get<number>('PORT', { infer: true }) as number) || 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');

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
