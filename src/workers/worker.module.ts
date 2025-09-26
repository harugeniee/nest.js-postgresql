import { Module } from '@nestjs/common';

import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { MailModule } from 'src/shared/services/mail/mail.module';
import { CommentsModule } from 'src/comments/comments.module';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [MailModule, CommentsModule, ShareModule],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
