import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { AnalyticsMetric } from '../entities/analytics-metric.entity';

@Injectable()
export class AnalyticsMetricService extends BaseService<AnalyticsMetric> {
  private readonly logger = new Logger(AnalyticsMetricService.name);
  constructor(
    @InjectRepository(AnalyticsMetric)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetric>,

    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<AnalyticsMetric>(analyticsMetricRepository),
      {
        entityName: 'AnalyticsMetric',
        cache: {
          enabled: true,
          prefix: 'analytics_metric',
          ttlSec: 300,
          swrSec: 60,
        },
        defaultSearchField: 'metricType',
      },
      cacheService,
    );
  }
}
