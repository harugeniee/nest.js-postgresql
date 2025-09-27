import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { followConfig, FollowConfig } from '../shared/config/follow.config';
import { AnalyticsModule } from 'src/analytics/analytics.module';

// Entities
import { UserFollowBitset } from './entities/user-follow-bitset.entity';
import { UserFollowEdge } from './entities/user-follow-edge.entity';

// Services
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { FollowSuggestionsService } from './follow-suggestions.service';
import { NewsFeedService } from './newsfeed.service';

// Adapters
import {
  RoaringAdapterFactory,
  RoaringAdapter,
} from './adapters/roaring.adapter';

// Controller
import { FollowController } from './follow.controller';

// Tasks
import { FollowRebuildTask } from './tasks/follow.rebuild.task';

/**
 * FollowModule - Main module for follow system
 *
 * Provides follow/unfollow functionality using roaring bitmap
 * for high-performance social media operations
 */
@Module({
  imports: [
    ConfigModule.forFeature(followConfig),
    TypeOrmModule.forFeature([UserFollowBitset, UserFollowEdge]),
    AnalyticsModule,
  ],
  controllers: [FollowController],
  providers: [
    // Adapter factory
    RoaringAdapterFactory,
    {
      provide: 'ROARING_ADAPTER',
      useFactory: async (factory: RoaringAdapterFactory) => {
        return await factory.createAdapter();
      },
      inject: [RoaringAdapterFactory],
    },
    // Services
    FollowCacheService,
    FollowBitsetService,
    FollowSuggestionsService,
    NewsFeedService,
    // Tasks
    FollowRebuildTask,
  ],
  exports: [
    FollowBitsetService,
    FollowCacheService,
    FollowSuggestionsService,
    NewsFeedService,
    'ROARING_ADAPTER',
  ],
})
export class FollowModule implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @Inject('ROARING_ADAPTER') private readonly roaringAdapter: RoaringAdapter,
  ) {}

  async onModuleInit() {
    // Initialize roaring adapter
    if (!this.roaringAdapter.isReady()) {
      await this.roaringAdapter.init();
    }

    // Log configuration
    const config = this.configService.get<FollowConfig>('follow');
    console.log('🔗 Follow Module initialized with config:', {
      backend: config?.backend,
      storageMode: config?.storageMode,
      persistIntervalSec: config?.persistIntervalSec,
      maxFollowsPerSecond: config?.maxFollowsPerSecond,
    });
  }
}
