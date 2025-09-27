import { Media } from 'src/media/entities/media.entity';
import { RabbitmqModule } from 'src/shared/services';
import { AnalyticsModule } from 'src/analytics/analytics.module';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment, CommentMedia, CommentMention } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Media, CommentMention, CommentMedia]),
    RabbitmqModule,
    AnalyticsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
