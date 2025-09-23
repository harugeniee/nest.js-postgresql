import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { RabbitmqModule } from 'src/shared/services';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reaction, ReactionCount]),
    RabbitmqModule,
    AnalyticsModule,
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
