import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ShareAggDaily } from './entities/share-agg-daily.entity';
import { ShareLink } from './entities/share-link.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';

/**
 * Share aggregation service for daily metrics aggregation
 *
 * Features:
 * - Daily aggregation of share link metrics
 * - Automated ETL job for data processing
 * - Data retention and cleanup
 * - Performance optimization for reporting
 */
@Injectable()
export class ShareAggregationService extends BaseService<ShareAggDaily> {
  constructor(
    @InjectRepository(ShareAggDaily)
    private readonly shareAggDailyRepository: Repository<ShareAggDaily>,
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(ShareClick)
    private readonly shareClickRepository: Repository<ShareClick>,
    @InjectRepository(ShareConversion)
    private readonly shareConversionRepository: Repository<ShareConversion>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<ShareAggDaily>(shareAggDailyRepository),
      {
        entityName: 'ShareAggDaily',
        cache: {
          enabled: true,
          ttlSec: 600,
          prefix: 'share_agg_daily',
          swrSec: 120,
        },
        defaultSearchField: 'shareId',
        relationsWhitelist: {
          shareLink: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Daily aggregation job - runs at 2 AM every day
   * Aggregates metrics for the previous day
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyAggregation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(
      `Running daily aggregation for ${yesterday.toISOString().split('T')[0]}`,
    );

    try {
      await this.aggregateDay(yesterday, today);
      console.log(
        `Daily aggregation completed for ${yesterday.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      console.error(
        `Daily aggregation failed for ${yesterday.toISOString().split('T')[0]}:`,
        error,
      );
    }
  }

  /**
   * Aggregate metrics for a specific day
   *
   * @param startDate - Start date (beginning of day)
   * @param endDate - End date (beginning of next day)
   */
  async aggregateDay(startDate: Date, endDate: Date): Promise<void> {
    const dayString = startDate.toISOString().split('T')[0];

    // Get all active share links
    const shareLinks = await this.shareLinkRepository.find({
      where: { isActive: true },
      select: ['id'],
    });

    for (const shareLink of shareLinks) {
      await this.aggregateShareLinkForDay(
        shareLink.id,
        startDate,
        endDate,
        dayString,
      );
    }
  }

  /**
   * Aggregate metrics for a specific share link and day
   *
   * @param shareId - Share link ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param dayString - Day string (YYYY-MM-DD)
   */
  private async aggregateShareLinkForDay(
    shareId: string,
    startDate: Date,
    endDate: Date,
    dayString: string,
  ): Promise<void> {
    // Check if aggregation already exists
    const existingAgg = await this.shareAggDailyRepository.findOne({
      where: { shareId, day: new Date(dayString) },
    });

    if (existingAgg) {
      // Update existing aggregation
      await this.updateAggregation(existingAgg, shareId, startDate, endDate);
    } else {
      // Create new aggregation
      await this.createAggregation(shareId, startDate, endDate, dayString);
    }
  }

  /**
   * Create new daily aggregation
   *
   * @param shareId - Share link ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param dayString - Day string
   */
  private async createAggregation(
    shareId: string,
    startDate: Date,
    endDate: Date,
    dayString: string,
  ): Promise<void> {
    // Get clicks count
    const clicks = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
        ts: Between(startDate, endDate),
      },
    });

    // Get unique visitors count
    const uniqueResult = await this.shareClickRepository
      .createQueryBuilder('click')
      .select('COUNT(DISTINCT click.ipHash)', 'count')
      .where('click.shareId = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :startDate', { startDate })
      .andWhere('click.ts < :endDate', { endDate })
      .getRawOne();

    const uniques = parseInt(uniqueResult.count) || 0;

    // Get conversions count
    const conversions = await this.shareConversionRepository.count({
      where: {
        shareId,
        attributed: true,
        occurredAt: Between(startDate, endDate),
      },
    });

    // Get conversion value
    const conversionValueResult = await this.shareConversionRepository
      .createQueryBuilder('conversion')
      .select('COALESCE(SUM(conversion.convValue), 0)', 'total')
      .where('conversion.shareId = :shareId', { shareId })
      .andWhere('conversion.attributed = true')
      .andWhere('conversion.occurredAt >= :startDate', { startDate })
      .andWhere('conversion.occurredAt < :endDate', { endDate })
      .getRawOne();

    const conversionValue = parseFloat(conversionValueResult.total) || 0;

    // Create aggregation record
    const aggregation = this.shareAggDailyRepository.create({
      shareId,
      day: dayString,
      clicks,
      uniques,
      convs: conversions,
      convValue: conversionValue,
    });

    await this.shareAggDailyRepository.save(aggregation);
  }

  /**
   * Update existing daily aggregation
   *
   * @param aggregation - Existing aggregation
   * @param shareId - Share link ID
   * @param startDate - Start date
   * @param endDate - End date
   */
  private async updateAggregation(
    aggregation: ShareAggDaily,
    shareId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Recalculate all metrics
    const clicks = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
        ts: Between(startDate, endDate),
      },
    });

    const uniqueResult = await this.shareClickRepository
      .createQueryBuilder('click')
      .select('COUNT(DISTINCT click.ipHash)', 'count')
      .where('click.shareId = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :startDate', { startDate })
      .andWhere('click.ts < :endDate', { endDate })
      .getRawOne();

    const uniques = parseInt(uniqueResult.count) || 0;

    const conversions = await this.shareConversionRepository.count({
      where: {
        shareId,
        attributed: true,
        occurredAt: Between(startDate, endDate),
      },
    });

    const conversionValueResult = await this.shareConversionRepository
      .createQueryBuilder('conversion')
      .select('COALESCE(SUM(conversion.convValue), 0)', 'total')
      .where('conversion.shareId = :shareId', { shareId })
      .andWhere('conversion.attributed = true')
      .andWhere('conversion.occurredAt >= :startDate', { startDate })
      .andWhere('conversion.occurredAt < :endDate', { endDate })
      .getRawOne();

    const conversionValue = parseFloat(conversionValueResult.total) || 0;

    // Update aggregation
    aggregation.clicks = clicks;
    aggregation.uniques = uniques;
    aggregation.convs = conversions;
    aggregation.convValue = conversionValue;

    await this.shareAggDailyRepository.save(aggregation);
  }

  /**
   * Get aggregated metrics for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Aggregated metrics
   */
  async getAggregatedMetrics(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any> {
    const aggregations = await this.shareAggDailyRepository.find({
      where: {
        shareId,
        day: Between(
          new Date(fromDate.toISOString().split('T')[0]),
          new Date(toDate.toISOString().split('T')[0]),
        ),
      },
      order: { day: 'ASC' },
    });

    const totalClicks = aggregations.reduce((sum, agg) => sum + agg.clicks, 0);
    const totalUniques = aggregations.reduce(
      (sum, agg) => sum + agg.uniques,
      0,
    );
    const totalConversions = aggregations.reduce(
      (sum, agg) => sum + agg.convs,
      0,
    );
    const totalConversionValue = aggregations.reduce(
      (sum, agg) => sum + agg.convValue,
      0,
    );

    return {
      totalClicks,
      totalUniques,
      totalConversions,
      totalConversionValue,
      dailyBreakdown: aggregations.map((agg) => ({
        date: agg.day,
        clicks: agg.clicks,
        uniques: agg.uniques,
        conversions: agg.convs,
        conversionValue: agg.convValue,
      })),
    };
  }

  /**
   * Clean up old aggregation data
   * Remove aggregations older than 1 year
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldAggregations(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    const result = await this.shareAggDailyRepository
      .createQueryBuilder()
      .delete()
      .where('day < :cutoffDate', { cutoffDate: cutoffString })
      .execute();

    console.log(`Cleaned up ${result.affected} old aggregation records`);
  }

  /**
   * Clean up old click data
   * Remove clicks older than 90 days
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldClicks(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.shareClickRepository
      .createQueryBuilder()
      .delete()
      .where('ts < :cutoffDate', { cutoffDate })
      .execute();

    console.log(`Cleaned up ${result.affected} old click records`);
  }
}
