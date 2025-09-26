import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ShareLinksController } from './share-links.controller';
import { ShareRedirectController } from './share-redirect.controller';
import { ShareService } from './share.service';
import { ShareLinksService } from './share-links.service';
import { ShareAttributionService } from './share-attribution.service';
import { ShareAggregationService } from './share-aggregation.service';

// Entities
import { ShareChannel } from './entities/share-channel.entity';
import { Campaign } from './entities/campaign.entity';
import { ShareLink } from './entities/share-link.entity';
import { ShareSession } from './entities/share-session.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareAttribution } from './entities/share-attribution.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { ShareAggDaily } from './entities/share-agg-daily.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShareChannel,
      Campaign,
      ShareLink,
      ShareSession,
      ShareClick,
      ShareAttribution,
      ShareConversion,
      ShareAggDaily,
    ]),
    ScheduleModule,
  ],
  controllers: [ShareLinksController, ShareRedirectController],
  providers: [
    ShareService,
    ShareLinksService,
    ShareAttributionService,
    ShareAggregationService,
  ],
  exports: [
    ShareService,
    ShareLinksService,
    ShareAttributionService,
    ShareAggregationService,
  ],
})
export class ShareModule {}
