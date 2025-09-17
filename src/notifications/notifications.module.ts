import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationPreference } from './entities';
import { CacheModule } from 'src/shared/services/cache/cache.module';
import { RabbitmqModule } from 'src/shared/services/rabbitmq/rabbitmq.module';
import { MailModule } from 'src/shared/services/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    CacheModule,
    RabbitmqModule,
    MailModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationPreferenceService],
  exports: [NotificationsService, NotificationPreferenceService],
})
export class NotificationsModule {}
