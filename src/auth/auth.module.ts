import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/shared/services/mail/mail.module';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisOtpStore, MailerEmailOtpSender } from './providers';

@Module({
  imports: [
    UsersModule,
    MailModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisOtpStore, MailerEmailOtpSender],
})
export class AuthModule {}
