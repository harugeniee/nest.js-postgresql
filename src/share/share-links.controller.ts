import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ShareLinksService } from './share-links.service';
import { ShareService } from './share.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareMetricsDto } from './dto/share-metrics.dto';
import { SnowflakeIdPipe } from 'src/common/pipes';

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
}
