import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './entities/article.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService, ScheduledPublishingService],
})
export class ArticlesModule {}
