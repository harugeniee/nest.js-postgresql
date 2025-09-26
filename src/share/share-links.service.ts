import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';

import { ShareLink } from './entities/share-link.entity';
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
          owner: true,
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
      relations: ['owner', 'channel', 'campaign'],
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
      relations: ['owner'],
    });

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    const fromDate = metricsDto.from
      ? new Date(metricsDto.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = metricsDto.to ? new Date(metricsDto.to) : new Date();

    // Get clicks
    const clicks = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .where('shareLink.id = :shareId', { shareId: shareLink.id })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .getCount();

    // Get unique visitors
    const uniquesResult: { count: string } | undefined =
      await this.shareLinkRepository
        .createQueryBuilder('shareLink')
        .leftJoin('shareLink.clicks', 'click')
        .select('COUNT(DISTINCT click.ipHash)', 'count')
        .where('shareLink.id = :shareId', { shareId: shareLink.id })
        .andWhere('click.isCountable = true')
        .andWhere('click.ts >= :fromDate', { fromDate })
        .andWhere('click.ts <= :toDate', { toDate })
        .getRawOne();

    // Get conversions
    const conversions = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.conversions', 'conversion')
      .where('shareLink.id = :shareId', { shareId: shareLink.id })
      .andWhere('conversion.attributed = true')
      .andWhere('conversion.occurredAt >= :fromDate', { fromDate })
      .andWhere('conversion.occurredAt <= :toDate', { toDate })
      .getCount();

    // Get conversion value
    const conversionValueResult: { total: string } | undefined =
      await this.shareLinkRepository
        .createQueryBuilder('shareLink')
        .leftJoin('shareLink.conversions', 'conversion')
        .select('COALESCE(SUM(conversion.convValue), 0)', 'total')
        .where('shareLink.id = :shareId', { shareId: shareLink.id })
        .andWhere('conversion.attributed = true')
        .andWhere('conversion.occurredAt >= :fromDate', { fromDate })
        .andWhere('conversion.occurredAt <= :toDate', { toDate })
        .getRawOne();

    // Get top referrers
    const topReferrers = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .select('click.referrer', 'referrer')
      .addSelect('COUNT(*)', 'clicks')
      .where('shareLink.id = :shareId', { shareId: shareLink.id })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .andWhere('click.referrer IS NOT NULL')
      .groupBy('click.referrer')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // Get geographic distribution
    const geoDistribution = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .select('click.country', 'country')
      .addSelect('COUNT(*)', 'clicks')
      .where('shareLink.id = :shareId', { shareId: shareLink.id })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .andWhere('click.country IS NOT NULL')
      .groupBy('click.country')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // Get daily breakdown
    const dailyBreakdown = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .leftJoin('shareLink.conversions', 'conversion')
      .select('DATE(click.ts)', 'date')
      .addSelect('COUNT(DISTINCT click.id)', 'clicks')
      .addSelect('COUNT(DISTINCT click.ipHash)', 'uniques')
      .addSelect('COUNT(DISTINCT conversion.id)', 'conversions')
      .addSelect('COALESCE(SUM(conversion.convValue), 0)', 'conversionValue')
      .where('shareLink.id = :shareId', { shareId: shareLink.id })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :fromDate', { fromDate })
      .andWhere('click.ts <= :toDate', { toDate })
      .groupBy('DATE(click.ts)')
      .orderBy('DATE(click.ts)', 'ASC')
      .getRawMany();

    return {
      clicks,
      uniques: parseInt(uniquesResult?.count || '0') || 0,
      conversions,
      conversionValue: parseFloat(conversionValueResult?.total || '0') || 0,
      topReferrers: topReferrers.map(
        (r: { referrer: string; clicks: string }) => ({
          referrer: String(r.referrer || ''),
          clicks: parseInt(String(r.clicks || '0')),
        }),
      ),
      geoDistribution: geoDistribution.map(
        (g: { country: string; clicks: string }) => ({
          country: String(g.country || ''),
          clicks: parseInt(String(g.clicks || '0')),
        }),
      ),
      dailyBreakdown: dailyBreakdown.map(
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
      ),
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

    // Get total clicks
    const totalClicks = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .where('shareLink.id = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .getCount();

    // Get clicks today
    const clicksToday = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .where('shareLink.id = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :today', { today })
      .getCount();

    // Get clicks yesterday
    const clicksYesterday = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .where('shareLink.id = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :yesterday', { yesterday })
      .andWhere('click.ts < :today', { today })
      .getCount();

    // Get clicks last 7 days
    const clicksLast7Days = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.clicks', 'click')
      .where('shareLink.id = :shareId', { shareId })
      .andWhere('click.isCountable = true')
      .andWhere('click.ts >= :last7Days', { last7Days })
      .getCount();

    // Get total conversions
    const totalConversions = await this.shareLinkRepository
      .createQueryBuilder('shareLink')
      .leftJoin('shareLink.conversions', 'conversion')
      .where('shareLink.id = :shareId', { shareId })
      .andWhere('conversion.attributed = true')
      .getCount();

    return {
      totalClicks,
      clicksToday,
      clicksYesterday,
      clicksLast7Days,
      totalConversions,
    };
  }
}
