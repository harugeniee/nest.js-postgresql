import {
  AcceptLanguageResolver,
  CookieResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { MediaModule } from './media/media.module';
import { QrModule } from './qr/qr.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { ReactionsModule } from './reactions/reactions.module';
import {
  appConfig,
  awsConfig,
  databaseConfig,
  DatabaseConfigFactory,
  firebaseConfig,
  mailConfig,
  oauthConfig,
  r2Config,
  redisConfig,
  stickerConfig,
} from './shared/config';
import { configValidationSchema } from './shared/config/schema';
import { CacheModule, MailModule, RabbitmqModule } from './shared/services';
import { StickersModule } from './stickers/stickers.module';
import { UsersModule } from './users/users.module';
import { WorkerModule } from './workers/worker.module';

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
        () => ({
          sticker: stickerConfig(),
        }),
        () => ({ firebase: firebaseConfig() }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigFactory,
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
    CommentsModule,
    StickersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
