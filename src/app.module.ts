import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import {
  appConfig,
  awsConfig,
  databaseConfig,
  DatabaseConfigFactory,
  mailConfig,
  oauthConfig,
  redisConfig,
} from './shared/config';
import { configValidationSchema } from './shared/config/schema';
import { CacheModule } from './shared/services/cache.module';
import { UsersModule } from './users/users.module';
import { WorkerModule } from './workers/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      cache: true,
      load: [
        () => ({ app: appConfig() }),
        () => ({ database: databaseConfig() }),
        () => ({ redis: redisConfig() }),
        () => ({ mail: mailConfig() }),
        () => ({ aws: awsConfig() }),
        () => ({ oauth: oauthConfig() }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigFactory,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('redis.url', { infer: true }),
      }),
    }),
    UsersModule,
    CacheModule,
    WorkerModule,
    RabbitmqModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
