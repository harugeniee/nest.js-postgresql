import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailQueueService } from './mail-queue.service';
import { MailQueueIntegrationService } from './mail-queue-integration.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Global()
@Module({
  imports: [RabbitmqModule],
  controllers: [MailController],
  providers: [MailService, MailQueueService, MailQueueIntegrationService],
  exports: [MailService, MailQueueService, MailQueueIntegrationService],
})
export class MailModule {}
