import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Author, AuthorSeries } from 'src/authors/entities';
import { Character, CharacterStaff } from 'src/characters/entities';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { Staff, StaffSeries } from 'src/staffs/entities';
import { Studio, StudioSeries } from 'src/studios/entities';
import { Tag } from 'src/tags/entities/tag.entity';
import { CacheModule, RabbitmqModule } from 'src/shared/services';
import { Genre, Segments, Series, SeriesGenre } from './entities';
import { GenresController } from './genres.controller';
import { SeriesController } from './series.controller';
import { SegmentsController } from './segments.controller';
import { SeriesService } from './series.service';
import { AniListCrawlService } from './services/anilist-crawl.service';
import { GenresService } from './services/genres.service';
import { SegmentsService } from './services/segments.service';
import { JikanApiService } from './services/jikan-api.service';
import { JikanMapperService } from './services/jikan-mapper.service';
import { JikanCrawlService } from './services/jikan-crawl.service';
import { JikanSeriesCronjobService } from './services/jikan-series-cronjob.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Series,
      Genre,
      Segments,
      SeriesGenre,
      Tag,
      Character,
      CharacterStaff,
      Staff,
      StaffSeries,
      Studio,
      StudioSeries,
      Author,
      AuthorSeries,
    ]),
    ReactionsModule,
    PermissionsModule,
    HttpModule,
    CacheModule,
    RabbitmqModule,
  ],
  controllers: [SeriesController, GenresController, SegmentsController],
  providers: [
    SeriesService,
    GenresService,
    AniListCrawlService,
    SegmentsService,
    JikanApiService,
    JikanMapperService,
    JikanCrawlService,
    JikanSeriesCronjobService,
  ],
  exports: [
    SeriesService,
    GenresService,
    AniListCrawlService,
    SegmentsService,
    JikanApiService,
    JikanMapperService,
    JikanCrawlService,
    JikanSeriesCronjobService,
  ],
})
export class SeriesModule {}
