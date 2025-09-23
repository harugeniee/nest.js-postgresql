import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './entities/article.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), AnalyticsModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ScheduledPublishingService],
})
export class ArticlesModule {}
