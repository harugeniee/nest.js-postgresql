import {
  AcceptLanguageResolver,
  CookieResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';

import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { QrModule } from './qr/qr.module';
import {
  appConfig,
  awsConfig,
  databaseConfig,
  DatabaseConfigFactory,
  mailConfig,
  oauthConfig,
  redisConfig,
  r2Config,
} from './shared/config';
import { configValidationSchema } from './shared/config/schema';
import { CacheModule, RabbitmqModule, MailModule } from './shared/services';
import { UsersModule } from './users/users.module';
import { WorkerModule } from './workers/worker.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ArticlesModule } from './articles/articles.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
        () => ({
          r2: r2Config(),
        }),
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
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.getOrThrow<string>(
          'app.i18n.fallbackLanguage',
        ),
        loaderOptions: {
          path: join(__dirname, '../i18n/'),
          watch: true,
        },
      }),
      resolvers: [
        new QueryResolver(['lang', 'language']),
        new HeaderResolver(['x-api-language', 'x-custom-lang', 'x-lang']),
        new CookieResolver(),
        AcceptLanguageResolver,
      ],
      inject: [ConfigService],
    }),
    UsersModule,
    CacheModule,
    WorkerModule,
    RabbitmqModule,
    MailModule,
    MediaModule,
    AuthModule,
    QrModule,
    RateLimitModule,
    ArticlesModule,
    ReactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
