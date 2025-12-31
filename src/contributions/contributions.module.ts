import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersModule } from 'src/characters/characters.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SeriesModule } from 'src/series/series.module';
import { CacheModule } from 'src/shared/services/cache/cache.module';
import { StaffsModule } from 'src/staffs/staffs.module';
import { UsersModule } from 'src/users/users.module';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { Contribution } from './entities/contribution.entity';
import { ContributionProcessorService } from './services/contribution-processor.service';

/**
 * Contributions Module
 *
 * Handles user contributions (create/update requests for entities)
 * that require admin approval before being applied.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Contribution]),
    NotificationsModule,
    UsersModule,
    SeriesModule,
    CharactersModule,
    StaffsModule,
    CacheModule,
  ],
  controllers: [ContributionsController],
  providers: [ContributionsService, ContributionProcessorService],
  exports: [ContributionsService, ContributionProcessorService],
})
export class ContributionsModule {}
