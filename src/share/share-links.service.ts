import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';

import { ShareLink } from './entities/share-link.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import {
  ShareMetricsDto,
  ShareMetricsResponseDto,
} from './dto/share-metrics.dto';

/**
 * Share links service for managing share links
 *
 * Features:
 * - CRUD operations for share links
 * - Metrics and analytics
 * - Integration with base service for caching and pagination
 */
@Injectable()
export class ShareLinksService extends BaseService<ShareLink> {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(ShareClick)
    private readonly shareClickRepository: Repository<ShareClick>,
    @InjectRepository(ShareConversion)
    private readonly shareConversionRepository: Repository<ShareConversion>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<ShareLink>(shareLinkRepository),
      {
        entityName: 'ShareLink',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'share_links',
          swrSec: 60,
        },
        defaultSearchField: 'code',
        relationsWhitelist: {
          user: true,
          channel: true,
          campaign: true,
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof ShareLink)[] {
    return ['code', 'note'];
  }

  /**
   * Create a new share link
   *
   * @param createShareLinkDto - Share link data
   * @returns Created share link
   */
  async createShareLink(
    createShareLinkDto: CreateShareLinkDto,
  ): Promise<ShareLink> {
    return await this.create(createShareLinkDto);
  }

  /**
   * Get share links for specific content
   *
   * @param contentType - Type of content
   * @param contentId - Content ID
   * @returns Array of share links with summary metrics
   */
  async getShareLinksForContent(
    contentType: string,
    contentId: string,
  ): Promise<Array<ShareLink & { summary: Record<string, unknown> }>> {
    const shareLinks = await this.shareLinkRepository.find({
      where: { contentType, contentId, isActive: true },
      relations: ['user', 'channel', 'campaign'],
      order: { createdAt: 'DESC' },
    });

    // Get summary metrics for each share link
    const shareLinksWithMetrics = await Promise.all(
      shareLinks.map(async (shareLink) => {
        const summary: Record<string, unknown> = await this.getShareLinkSummary(
          shareLink.id,
        );
        return {
          ...shareLink,
          summary,
        } as ShareLink & { summary: Record<string, unknown> };
      }),
    );

    return shareLinksWithMetrics;
  }

  /**
   * Get metrics for a specific share link
   *
   * @param code - Share link code
   * @param metricsDto - Metrics parameters
   * @returns Share link metrics
   */
  async getShareLinkMetrics(
    code: string,
    metricsDto: ShareMetricsDto,
  ): Promise<ShareMetricsResponseDto> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { code },
      relations: ['user'],
    });

    if (!shareLink) {
      throw new HttpException(
        { messageKey: 'share.SHARE_LINK_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const fromDate = metricsDto.from
      ? new Date(metricsDto.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = metricsDto.to ? new Date(metricsDto.to) : new Date();

    // Get clicks using repository method
    const clicks = await this.shareClickRepository.count({
      where: {
        shareId: shareLink.id,
        isCountable: true,
        ts: Between(fromDate, toDate),
      },
    });

    // Get unique visitors using repository method
    const uniques = await this.getUniqueVisitorsCount(
      shareLink.id,
      fromDate,
      toDate,
    );

    // Get conversions using repository method
    const conversions = await this.shareConversionRepository.count({
      where: {
        shareId: shareLink.id,
        attributed: true,
        occurredAt: Between(fromDate, toDate),
      },
    });

    // Get conversion value using repository method
    const conversionValue = await this.getConversionValue(
      shareLink.id,
      fromDate,
      toDate,
    );

    // Get top referrers using repository method
    const topReferrers = await this.getTopReferrers(
      shareLink.id,
      fromDate,
      toDate,
    );

    // Get geographic distribution using repository method
    const geoDistribution = await this.getGeographicDistribution(
      shareLink.id,
      fromDate,
      toDate,
    );

    // Get daily breakdown using repository method
    const dailyBreakdown = await this.getDailyBreakdown(
      shareLink.id,
      fromDate,
      toDate,
    );

    return {
      clicks,
      uniques,
      conversions,
      conversionValue,
      topReferrers,
      geoDistribution,
      dailyBreakdown,
    };
  }

  /**
   * Get summary metrics for a share link
   *
   * @param shareId - Share link ID
   * @returns Summary metrics
   */
  private async getShareLinkSummary(
    shareId: string,
  ): Promise<Record<string, unknown>> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total clicks using repository method
    const totalClicks = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
      },
    });

    // Get clicks today using repository method
    const clicksToday = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
        ts: Between(today, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
      },
    });

    // Get clicks yesterday using repository method
    const clicksYesterday = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
        ts: Between(yesterday, today),
      },
    });

    // Get clicks last 7 days using repository method
    const clicksLast7Days = await this.shareClickRepository.count({
      where: {
        shareId,
        isCountable: true,
        ts: Between(last7Days, today),
      },
    });

    // Get total conversions using repository method
    const totalConversions = await this.shareConversionRepository.count({
      where: {
        shareId,
        attributed: true,
      },
    });

    return {
      totalClicks,
      clicksToday,
      clicksYesterday,
      clicksLast7Days,
      totalConversions,
    };
  }

  /**
   * Get unique visitors count for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Number of unique visitors
   */
  private async getUniqueVisitorsCount(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    // Get all clicks in the date range
    const clicks = await this.shareClickRepository.find({
      where: {
        shareId,
        isCountable: true,
        ts: Between(fromDate, toDate),
      },
      select: ['ipHash'],
    });

    // Count unique IP hashes using Set
    const uniqueIpHashes = new Set(
      clicks.map((click) => click.ipHash).filter(Boolean),
    );
    return uniqueIpHashes.size;
  }

  /**
   * Get conversion value for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Total conversion value
   */
  private async getConversionValue(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    // For SUM aggregation, we need to use queryBuilder
    const result: { total: string } | undefined =
      await this.shareConversionRepository
        .createQueryBuilder('conversion')
        .select('COALESCE(SUM(conversion.convValue), 0)', 'total')
        .where('conversion.shareId = :shareId', { shareId })
        .andWhere('conversion.attributed = true')
        .andWhere('conversion.occurredAt >= :fromDate', { fromDate })
        .andWhere('conversion.occurredAt <= :toDate', { toDate })
        .getRawOne();

    return parseFloat(result?.total || '0') || 0;
  }

  /**
   * Get top referrers for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Array of top referrers with click counts
   */
  private async getTopReferrers(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Array<{ referrer: string; clicks: number }>> {
    // For GROUP BY and ORDER BY, we need to use queryBuilder
    const results = await this.shareClickRepository
      .createQueryBuilder('click')
      .select('click.referrer', 'referrer')
      .addSelect('COUNT(*)', 'clicks')
      .where('click.shareId = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .andWhere('click.referrer IS NOT NULL')
      .groupBy('click.referrer')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map((r: { referrer: string; clicks: string }) => ({
      referrer: String(r.referrer || ''),
      clicks: parseInt(String(r.clicks || '0')),
    }));
  }

  /**
   * Get geographic distribution for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Array of countries with click counts
   */
  private async getGeographicDistribution(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Array<{ country: string; clicks: number }>> {
    // For GROUP BY and ORDER BY, we need to use queryBuilder
    const results = await this.shareClickRepository
      .createQueryBuilder('click')
      .select('click.country', 'country')
      .addSelect('COUNT(*)', 'clicks')
      .where('click.shareId = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .andWhere('click.country IS NOT NULL')
      .groupBy('click.country')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map((g: { country: string; clicks: string }) => ({
      country: String(g.country || ''),
      clicks: parseInt(String(g.clicks || '0')),
    }));
  }

  /**
   * Get daily breakdown for a share link
   *
   * @param shareId - Share link ID
   * @param fromDate - Start date
   * @param toDate - End date
   * @returns Array of daily metrics
   */
  private async getDailyBreakdown(
    shareId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<
    Array<{
      date: string;
      clicks: number;
      uniques: number;
      conversions: number;
      conversionValue: number;
    }>
  > {
    // For complex aggregations with multiple tables, we need to use queryBuilder
    const results = await this.shareClickRepository
      .createQueryBuilder('click')
      .leftJoin(
        'share_conversions',
        'conversion',
        'conversion.shareId = click.shareId',
      )
      .select('DATE(click.ts)', 'date')
      .addSelect('COUNT(DISTINCT click.id)', 'clicks')
      .addSelect('COUNT(DISTINCT click.ipHash)', 'uniques')
      .addSelect('COUNT(DISTINCT conversion.id)', 'conversions')
      .addSelect('COALESCE(SUM(conversion.convValue), 0)', 'conversionValue')
      .where('click.shareId = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .groupBy('DATE(click.ts)')
      .orderBy('DATE(click.ts)', 'ASC')
      .getRawMany();

    return results.map(
      (d: {
        date: string;
        clicks: string;
        uniques: string;
        conversions: string;
        conversionValue: string;
      }) => ({
        date: String(d.date || ''),
        clicks: parseInt(String(d.clicks || '0')),
        uniques: parseInt(String(d.uniques || '0')),
        conversions: parseInt(String(d.conversions || '0')),
        conversionValue: parseFloat(String(d.conversionValue || '0')),
      }),
    );
  }
}
