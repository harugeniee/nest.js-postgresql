import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { ShareLink } from './entities/share-link.entity';
import { ShareSession } from './entities/share-session.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareAttribution } from './entities/share-attribution.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import {
  ShareAttributionDto,
  ShareConversionDto,
} from './dto/share-attribution.dto';
import { SHARE_CONSTANTS, ShareContentType } from './constants/share.constants';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { Article } from 'src/articles/entities/article.entity';
import { User } from 'src/users/entities/user.entity';
import { Media } from 'src/media/entities/media.entity';
import { Comment } from 'src/comments/entities/comment.entity';
import { BookmarkFolder } from 'src/bookmarks/entities/bookmark-folder.entity';
import { StickerPack } from 'src/stickers/entities/sticker-pack.entity';

/**
 * Main share service for handling share link operations
 *
 * Features:
 * - Share link creation and management
 * - Session tracking and cookie management
 * - Click tracking with anti-fraud measures
 * - Attribution and conversion tracking
 */
@Injectable()
export class ShareService extends BaseService<ShareLink> {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(ShareSession)
    private readonly shareSessionRepository: Repository<ShareSession>,
    @InjectRepository(ShareClick)
    private readonly shareClickRepository: Repository<ShareClick>,
    @InjectRepository(ShareAttribution)
    private readonly shareAttributionRepository: Repository<ShareAttribution>,
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

  /**
   * Create a new share link
   *
   * @param createShareLinkDto - Share link data
   * @returns Created share link
   */
  async createShareLink(
    createShareLinkDto: CreateShareLinkDto,
  ): Promise<ShareLink> {
    // Generate unique short code
    const code = await this.generateUniqueCode();

    return await this.create({
      ...createShareLinkDto,
      code,
    });
  }

  /**
   * Get share link by code with resolved content
   *
   * @param code - Share link code
   * @returns Share link with resolved content or null
   */
  async getShareLinkByCode(code: string): Promise<ShareLink | null> {
    const shareLink = await this.findOne(
      { code, isActive: true },
      { relations: ['user', 'channel', 'campaign'] },
    );

    if (!shareLink) {
      return null;
    }

    // Resolve content based on contentType
    shareLink.content = await this.resolveContent(
      shareLink.contentType as ShareContentType,
      shareLink.contentId,
    );

    return shareLink;
  }

  /**
   * Resolve content based on content type and ID
   *
   * @param contentType - Type of content
   * @param contentId - Content ID
   * @returns Resolved content or null
   */
  private async resolveContent(
    contentType: ShareContentType,
    contentId: string,
  ): Promise<
    User | Article | Media | Comment | BookmarkFolder | StickerPack | null
  > {
    switch (contentType) {
      case SHARE_CONSTANTS.CONTENT_TYPES.ARTICLE:
        return await this.resolveArticle(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.USER:
        return await this.resolveUser(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.MEDIA:
        return await this.resolveMedia(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.COMMENT:
        return await this.resolveComment(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.BOOKMARK_FOLDER:
        return await this.resolveBookmarkFolder(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.STICKER_PACK:
        return await this.resolveStickerPack(contentId);
      case SHARE_CONSTANTS.CONTENT_TYPES.QR_TICKET:
        return await this.resolveQrTicket(contentId);
      default:
        return null;
    }
  }

  /**
   * Resolve article content
   */
  private async resolveArticle(contentId: string): Promise<Article | null> {
    return await this.shareLinkRepository.manager.findOne(Article, {
      where: { id: contentId },
      relations: ['user'],
    });
  }

  /**
   * Resolve user content
   */
  private async resolveUser(contentId: string): Promise<User | null> {
    return await this.shareLinkRepository.manager.findOne(User, {
      where: { id: contentId },
    });
  }

  /**
   * Resolve media content
   */
  private async resolveMedia(contentId: string): Promise<Media | null> {
    return await this.shareLinkRepository.manager.findOne(Media, {
      where: { id: contentId },
    });
  }

  /**
   * Resolve comment content
   */
  private async resolveComment(contentId: string): Promise<Comment | null> {
    return await this.shareLinkRepository.manager.findOne(Comment, {
      where: { id: contentId },
      relations: ['user', 'article'],
    });
  }

  /**
   * Resolve bookmark folder content
   */
  private async resolveBookmarkFolder(
    contentId: string,
  ): Promise<BookmarkFolder | null> {
    return await this.shareLinkRepository.manager.findOne(BookmarkFolder, {
      where: { id: contentId },
      relations: ['user'],
    });
  }

  /**
   * Resolve sticker pack content
   */
  private async resolveStickerPack(
    contentId: string,
  ): Promise<StickerPack | null> {
    return await this.shareLinkRepository.manager.findOne(StickerPack, {
      where: { id: contentId },
    });
  }

  /**
   * Resolve QR ticket content
   */
  private async resolveQrTicket(contentId: string): Promise<null> {
    return null; // TODO: Implement when QR ticket entity is available
  }

  /**
   * Create a new session for tracking
   *
   * @param shareId - Share link ID
   * @returns Created session
   */
  async createSession(shareId: string): Promise<ShareSession> {
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = this.shareSessionRepository.create({
      shareId,
      sessionToken,
      expiresAt,
    });

    return await this.shareSessionRepository.save(session);
  }

  /**
   * Get session by token
   *
   * @param sessionToken - Session token
   * @returns Session or null
   */
  async getSessionByToken(sessionToken: string): Promise<ShareSession | null> {
    return await this.shareSessionRepository.findOne({
      where: { sessionToken },
      relations: ['shareLink'],
    });
  }

  /**
   * Track a click on a share link
   *
   * @param shareId - Share link ID
   * @param sessionId - Optional session ID
   * @param clickData - Click tracking data
   * @returns Created click record
   */
  async trackClick(
    shareId: string,
    sessionId: string | null,
    clickData: {
      event: 'click' | 'prefetch';
      referrer?: string;
      userAgent: string;
      country?: string;
      ipHash: string;
      uaHash: string;
      isBot: boolean;
      isCountable: boolean;
    },
  ): Promise<ShareClick> {
    const click = this.shareClickRepository.create({
      shareId,
      sessionId: sessionId || undefined,
      ts: new Date(),
      ...clickData,
    });

    return await this.shareClickRepository.save(click);
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
    const session = await this.getSessionByToken(attributionData.sessionToken);
    if (!session) {
      throw new HttpException('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    // Check if attribution already exists
    const existingAttribution = await this.shareAttributionRepository.findOne({
      where: {
        shareId: session.shareId,
        viewerUserId: attributionData.viewerUserId,
      },
    });

    if (existingAttribution) {
      // Update existing attribution
      existingAttribution.lastAt = new Date();
      existingAttribution.totalVisits += 1;
      return await this.shareAttributionRepository.save(existingAttribution);
    } else {
      // Create new attribution
      const attribution = this.shareAttributionRepository.create({
        shareId: session.shareId,
        viewerUserId: attributionData.viewerUserId,
        firstAt: new Date(),
        lastAt: new Date(),
        totalVisits: 1,
      });

      return await this.shareAttributionRepository.save(attribution);
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
    const session = await this.getSessionByToken(conversionData.sessionToken);
    if (!session) {
      throw new HttpException('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    // Check if conversion is within attribution window (7 days)
    const attributionWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const attributed = session.createdAt >= attributionWindow;

    const conversion = this.shareConversionRepository.create({
      shareId: session.shareId,
      viewerUserId: conversionData.viewerUserId,
      convType: conversionData.convType,
      convValue: conversionData.convValue,
      occurredAt: new Date(),
      attributed,
    });

    return await this.shareConversionRepository.save(conversion);
  }

  /**
   * Generate unique short code for share link
   *
   * @returns Unique short code
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-character alphanumeric code
      code = randomBytes(4).toString('hex');

      const existing = await this.shareLinkRepository.findOne({
        where: { code },
      });

      isUnique = !existing;
      attempts++;
    }

    if (!isUnique) {
      throw new HttpException(
        'Failed to generate unique code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return code!;
  }

  /**
   * Generate session token
   *
   * @returns Session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate IP hash for deduplication
   *
   * @param ip - IP address
   * @param userAgent - User agent string
   * @param secret - Secret key for hashing
   * @returns IP hash
   */
  generateIpHash(ip: string, userAgent: string, secret: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const data = `${ip}${userAgent}${secret}${today}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate user agent hash
   *
   * @param userAgent - User agent string
   * @returns User agent hash
   */
  generateUaHash(userAgent: string): string {
    return createHash('sha256').update(userAgent).digest('hex');
  }

  /**
   * Check if user agent is from a bot
   *
   * @param userAgent - User agent string
   * @returns True if bot
   */
  isBot(userAgent: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
      /whatsapp/i,
      /telegrambot/i,
      /slackbot/i,
      /discordbot/i,
      /googlebot/i,
      /bingbot/i,
      /yandexbot/i,
      /baiduspider/i,
      /duckduckbot/i,
      /applebot/i,
      /ia_archiver/i,
      /archive\.org_bot/i,
      /wayback/i,
      /preview/i,
      /validator/i,
      /checker/i,
      /monitor/i,
      /ping/i,
      /health/i,
      /uptime/i,
      /status/i,
    ];

    return botPatterns.some((pattern) => pattern.test(userAgent));
  }
}
