import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { Series } from 'src/series/entities/series.entity';
import { CacheModule, RabbitmqModule } from 'src/shared/services';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Character } from './entities/character.entity';
import { CharacterStaff } from './entities/character-staff.entity';
import { CharacterUpdateCronjobService } from './services/character-update-cronjob.service';
import { CharacterQueueService } from './services/character-queue.service';
import { JikanApiService } from './services/jikan-api.service';
import { CharacterUpdateService } from './services/character-update.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Character,
      CharacterStaff,
      ReactionCount,
      Series,
    ]),
    ReactionsModule,
    ScheduleModule,
    RabbitmqModule,
    HttpModule,
    CacheModule,
  ],
  controllers: [CharactersController],
  providers: [
    CharactersService,
    CharacterUpdateCronjobService,
    CharacterQueueService,
    JikanApiService,
    CharacterUpdateService,
  ],
  exports: [CharactersService, CharacterUpdateService, JikanApiService],
})
export class CharactersModule {}
