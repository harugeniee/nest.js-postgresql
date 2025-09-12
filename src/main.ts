import helmet from 'helmet';
import * as morgan from 'morgan';
import { I18nService } from 'nestjs-i18n';
import { I18nHttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/shared/interceptors/response.interceptor';
import { CacheService } from 'src/shared/services/cache/cache.service';

import {
  ConsoleLogger,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication, NestFactory } from '@nestjs/core';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/gateways/socket.adapter';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';

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

  // Get the logger instance from the app
  const logger = new Logger();
  app.enableCors({
    credentials: true, // Allow credentials
  });
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

  // Configure rate limiting
  const rateLimitGuard = app.get(RateLimitGuard);
  app.useGlobalGuards(rateLimitGuard);
  logger.log('✅ Rate limiting configured with unified rate limit guard');

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

  // WebSocket adapter
  if (configService.get<boolean>('WS_ADAPTER_ENABLED', { infer: true })) {
    // Setup WebSocket adapter with Redis support
    try {
      logger.log('🔧 Setting up WebSocket adapter...');

      // Get Redis instance from CacheService
      const cacheService = app.get(CacheService);
      const redis = cacheService.getRedisClient();
      const redisIoAdapter = new RedisIoAdapter(app, redis);

      // Initialize Redis connection for the adapter
      await redisIoAdapter.connectToRedis();

      app.useWebSocketAdapter(redisIoAdapter);
      logger.log('✅ WebSocket adapter configured successfully with Redis');
    } catch (error) {
      logger.error(
        '❌ Failed to configure WebSocket adapter with Redis:',
        error,
      );
      logger.warn(
        '⚠️  WebSocket will work with default in-memory adapter (no clustering support)',
      );

      // Fallback to default adapter
      const defaultAdapter = new IoAdapter(app);
      app.useWebSocketAdapter(defaultAdapter);
      logger.log(
        '✅ WebSocket adapter configured with default in-memory adapter',
      );
    }
  }

  await Promise.all([app.startAllMicroservices(), app.listen(port)]);
}
bootstrap();
