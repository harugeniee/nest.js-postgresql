import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { BroadcastNotificationService } from './broadcast-notification.service';
import { NotificationsController } from './notifications.controller';
import { BroadcastNotificationController } from './broadcast-notification.controller';
import { Notification, NotificationPreference } from './entities';
import { BroadcastNotification } from './entities/broadcast-notification.entity';
import { CacheModule } from 'src/shared/services/cache/cache.module';
import { RabbitmqModule } from 'src/shared/services/rabbitmq/rabbitmq.module';
import { MailModule } from 'src/shared/services/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      BroadcastNotification,
    ]),
    CacheModule,
    RabbitmqModule,
    MailModule,
  ],
  controllers: [NotificationsController, BroadcastNotificationController],
  providers: [
    NotificationsService,
    NotificationPreferenceService,
    BroadcastNotificationService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferenceService,
    BroadcastNotificationService,
  ],
})
export class NotificationsModule {}
