import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { Media } from 'src/media/entities/media.entity';
import { CommentMention } from './entities/comment-mention.entity';
import { CommentMedia } from './entities/comment-media.entity';
import { RabbitmqModule } from 'src/shared/services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Media, CommentMention, CommentMedia]),
    RabbitmqModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
