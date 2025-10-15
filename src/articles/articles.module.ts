import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    AnalyticsModule,
    PermissionsModule, // Import PermissionsModule to access UserPermissionService
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, ScheduledPublishingService],
})
export class ArticlesModule {}
