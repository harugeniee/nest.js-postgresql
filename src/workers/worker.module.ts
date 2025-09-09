import { Module } from '@nestjs/common';

import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { MailModule } from 'src/shared/services/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
