import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareMetricsDto } from './dto/share-metrics.dto';
import { ShareLinksService } from './share-links.service';
import { ShareService } from './share.service';

/**
 * Share links controller for managing share links
 *
 * Features:
 * - Create share links
 * - Get share links for posts
 * - Get share link metrics
 * - Authentication required for most operations
 */
@Controller('share-links')
export class ShareLinksController {
  constructor(
    private readonly shareLinksService: ShareLinksService,
    private readonly shareService: ShareService,
  ) {}

  /**
   * Create a new share link
   *
   * @param createShareLinkDto - Share link data
   * @returns Created share link
   */
  @Post()
  async createShareLink(@Body() createShareLinkDto: CreateShareLinkDto) {
    return await this.shareLinksService.createShareLink(createShareLinkDto);
  }

  /**
   * Get share links for specific content
   *
   * @param contentType - Type of content
   * @param contentId - Content ID
   * @returns Array of share links with summary metrics
   */
  @Get('content/:contentType/:contentId')
  getShareLinksForContent(
    @Param('contentType') contentType: string,
    @Param('contentId', new SnowflakeIdPipe()) contentId: string,
  ) {
    return this.shareLinksService.getShareLinksForContent(
      contentType,
      contentId,
    );
  }

  /**
   * Get share links for a specific post (legacy endpoint)
   *
   * @param postId - Post ID
   * @returns Array of share links with summary metrics
   */
  @Get('posts/:postId')
  async getShareLinksForPost(
    @Param('postId', new SnowflakeIdPipe()) postId: string,
  ) {
    return await this.shareLinksService.getShareLinksForContent(
      'article',
      postId,
    );
  }

  /**
   * Get metrics for a specific share link
   *
   * @param code - Share link code
   * @param metricsDto - Metrics parameters
   * @returns Share link metrics
   */
  @Get(':code/metrics')
  async getShareLinkMetrics(
    @Param('code') code: string,
    @Query() metricsDto: ShareMetricsDto,
  ) {
    return await this.shareLinksService.getShareLinkMetrics(code, metricsDto);
  }

  /**
   * Get share count for specific content
   *
   * @param contentType - Type of content
   * @param contentId - Content ID
   * @returns Number of shares for the content
   */
  @Get('count/:contentType/:contentId')
  async getShareCount(
    @Param('contentType') contentType: string,
    @Param('contentId', new SnowflakeIdPipe()) contentId: string,
  ) {
    const count = await this.shareService.getShareCount(contentType, contentId);
    return {
      contentType,
      contentId,
      shareCount: count,
    };
  }
}
