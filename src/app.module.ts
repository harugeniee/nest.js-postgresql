import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UsersModule } from './users/users.module';
import { CacheModule } from './shared/services/cache.module';
import { configValidationSchema } from './shared/config/schema';
import {
  databaseConfig,
  redisConfig,
  mailConfig,
  awsConfig,
  oauthConfig,
  appConfig,
  DatabaseConfigFactory,
} from './shared/config';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
