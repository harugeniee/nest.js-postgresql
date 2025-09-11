import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CacheService, RabbitmqModule } from 'src/shared/services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reaction, ReactionCount]),
    RabbitmqModule,
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService, CacheService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
