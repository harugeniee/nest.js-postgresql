import { Module } from '@nestjs/common';

import { AnalyticsModule } from 'src/analytics/analytics.module';
import { CharactersModule } from 'src/characters/characters.module';
import { CommentsModule } from 'src/comments/comments.module';
import { SeriesModule } from 'src/series/series.module';
import { ShareModule } from 'src/share/share.module';
import { CacheModule } from 'src/shared/services';
import { MailModule } from 'src/shared/services/mail/mail.module';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    MailModule,
    CommentsModule,
    ShareModule,
    AnalyticsModule,
    SeriesModule,
    CharactersModule,
    CacheModule,
  ],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
