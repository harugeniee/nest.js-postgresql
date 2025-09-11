import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CacheService } from 'src/shared/services';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reaction, ReactionCount]),
    EventEmitterModule,
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService, CacheService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
