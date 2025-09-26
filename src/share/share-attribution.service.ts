import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShareAttribution } from './entities/share-attribution.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import {
  ShareAttributionDto,
  ShareConversionDto,
} from './dto/share-attribution.dto';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';

/**
 * Share attribution service for handling attribution and conversion tracking
 *
 * Features:
 * - User attribution tracking
 * - Conversion recording
 * - Last-click attribution model (7-day window)
 * - Anti-fraud measures
 */
@Injectable()
export class ShareAttributionService extends BaseService<ShareAttribution> {
  constructor(
    @InjectRepository(ShareAttribution)
    private readonly shareAttributionRepository: Repository<ShareAttribution>,
    @InjectRepository(ShareConversion)
    private readonly shareConversionRepository: Repository<ShareConversion>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<ShareAttribution>(shareAttributionRepository),
      {
        entityName: 'ShareAttribution',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'share_attributions',
          swrSec: 60,
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
   * Record attribution for a user
   *
   * @param attributionData - Attribution data
   * @returns Created or updated attribution
   */
  async recordAttribution(
    attributionData: ShareAttributionDto,
  ): Promise<ShareAttribution> {
    // Check if attribution already exists
    const existingAttribution = await this.findOne({
      shareId: attributionData.shareId,
      viewerUserId: attributionData.viewerUserId,
    });

    if (existingAttribution) {
      // Update existing attribution
      return await this.update(existingAttribution.id, {
        lastAt: new Date(),
        totalVisits: existingAttribution.totalVisits + 1,
      });
    } else {
      // Create new attribution
      return await this.create({
        shareId: attributionData.shareId,
        viewerUserId: attributionData.viewerUserId,
        firstAt: new Date(),
        lastAt: new Date(),
        totalVisits: 1,
      });
    }
  }

  /**
   * Record a conversion
   *
   * @param conversionData - Conversion data
   * @returns Created conversion record
   */
  async recordConversion(
    conversionData: ShareConversionDto,
  ): Promise<ShareConversion> {
    // Check if conversion is within attribution window (7 days)
    const attributionWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find the most recent attribution for this user
    const attribution = await this.shareAttributionRepository.findOne({
      where: { viewerUserId: conversionData.viewerUserId },
      order: { lastAt: 'DESC' },
    });

    const attributed = attribution && attribution.lastAt >= attributionWindow;

    const conversion = this.shareConversionRepository.create({
      shareId: conversionData.shareId,
      viewerUserId: conversionData.viewerUserId,
      convType: conversionData.convType,
      convValue: conversionData.convValue,
      occurredAt: new Date(),
      attributed: !!attributed,
    });

    return await this.shareConversionRepository.save(conversion);
  }

  /**
   * Get attribution statistics for a share link
   *
   * @param shareId - Share link ID
   * @returns Attribution statistics
   */
  async getAttributionStats(shareId: string): Promise<any> {
    const totalAttributions = await this.shareAttributionRepository.count({
      where: { shareId },
    });

    const totalVisits = await this.getTotalVisits(shareId);

    const recentAttributions = await this.shareAttributionRepository.find({
      where: { shareId },
      order: { lastAt: 'DESC' },
      take: 10,
      relations: ['viewer'],
    });

    return {
      totalAttributions,
      totalVisits,
      recentAttributions,
    };
  }

  /**
   * Get conversion statistics for a share link
   *
   * @param shareId - Share link ID
   * @returns Conversion statistics
   */
  async getConversionStats(shareId: string): Promise<any> {
    const totalConversions = await this.shareConversionRepository.count({
      where: { shareId, attributed: true },
    });

    const totalConversionValue = await this.getTotalConversionValue(shareId);
    const conversionsByType = await this.getConversionsByType(shareId);

    return {
      totalConversions,
      totalConversionValue,
      conversionsByType,
    };
  }

  /**
   * Clean up expired attributions
   * Remove attributions older than 30 days
   */
  async cleanupExpiredAttributions(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.shareAttributionRepository
      .createQueryBuilder()
      .delete()
      .where('lastAt < :cutoffDate', { cutoffDate })
      .execute();
  }

  /**
   * Clean up expired conversions
   * Remove conversions older than 90 days
   */
  async cleanupExpiredConversions(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    await this.shareConversionRepository
      .createQueryBuilder()
      .delete()
      .where('occurredAt < :cutoffDate', { cutoffDate })
      .execute();
  }

  /**
   * Get total visits for a share link using repository sum method
   *
   * @param shareId - Share link ID
   * @returns Total visits count
   */
  private async getTotalVisits(shareId: string): Promise<number> {
    // Use QueryBuilder for SUM operation
    const result: { total: string } | undefined =
      await this.shareAttributionRepository
        .createQueryBuilder('attribution')
        .select('SUM(attribution.totalVisits)', 'total')
        .where('attribution.shareId = :shareId', { shareId })
        .getRawOne();

    return parseInt(result?.total || '0') || 0;
  }

  /**
   * Get total conversion value for a share link using repository sum method
   *
   * @param shareId - Share link ID
   * @returns Total conversion value
   */
  private async getTotalConversionValue(shareId: string): Promise<number> {
    // Use QueryBuilder for SUM operation
    const result: { total: string } | undefined =
      await this.shareConversionRepository
        .createQueryBuilder('conversion')
        .select('COALESCE(SUM(conversion.convValue), 0)', 'total')
        .where('conversion.shareId = :shareId', { shareId })
        .andWhere('conversion.attributed = true')
        .getRawOne();

    return parseFloat(result?.total || '0') || 0;
  }

  /**
   * Get conversions grouped by type using queryBuilder
   * This requires GROUP BY which cannot be done with simple repository methods
   *
   * @param shareId - Share link ID
   * @returns Conversions grouped by type
   */
  private async getConversionsByType(shareId: string): Promise<
    Array<{
      type: string;
      count: number;
      value: number;
    }>
  > {
    const conversionsByType: Array<{
      type: string;
      count: string;
      value: string;
    }> = await this.shareConversionRepository
      .createQueryBuilder('conversion')
      .select('conversion.convType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(conversion.convValue), 0)', 'value')
      .where('conversion.shareId = :shareId', { shareId })
      .andWhere('conversion.attributed = true')
      .groupBy('conversion.convType')
      .getRawMany();

    return conversionsByType.map((c) => ({
      type: c.type,
      count: parseInt(c.count),
      value: parseFloat(c.value),
    }));
  }
}
