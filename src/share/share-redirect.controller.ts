import {
  Controller,
  Get,
  Param,
  Res,
  Req,
  HttpException,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ShareService } from './share.service';
import { ShareAttributionService } from './share-attribution.service';
import {
  ShareAttributionDto,
  ShareConversionDto,
} from './dto/share-attribution.dto';
import { SHARE_CONSTANTS } from './constants/share.constants';
import { ShareLink } from './entities/share-link.entity';
import { ShareSession } from './entities/share-session.entity';

/**
 * Share redirect controller for handling short link redirects
 *
 * Features:
 * - Short link redirects (/s/:code)
 * - Session tracking with cookies
 * - Click tracking with anti-fraud measures
 * - Attribution and conversion endpoints
 */
@Controller('s')
export class ShareRedirectController {
  constructor(
    private readonly shareService: ShareService,
    private readonly shareAttributionService: ShareAttributionService,
  ) {}

  /**
   * Handle short link redirect
   *
   * @param code - Share link code
   * @param res - Express response object
   * @param req - Express request object
   */
  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // Get share link
    const shareLink = await this.shareService.getShareLinkByCode(code);
    if (!shareLink) {
      throw new HttpException('Share link not found', HttpStatus.NOT_FOUND);
    }

    // Check if share link is active
    if (!shareLink.isActive) {
      throw new HttpException('Share link is inactive', HttpStatus.GONE);
    }

    // Get or create session
    let sessionToken = req.cookies?.sid;
    let session: ShareSession | null = null;

    if (sessionToken) {
      session = await this.shareService.getSessionByToken(sessionToken);
    }

    if (!session) {
      session = await this.shareService.createSession(shareLink.id);
      sessionToken = session.sessionToken;
    }

    // Track click
    const userAgent = req.get('User-Agent') || '';
    const referrer = req.get('Referer') || req.get('Referrer') || undefined;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const country = (req.headers['cf-ipcountry'] as string) || undefined;

    // Detect if this is a prefetch request
    const isPrefetch =
      req.get('X-Purpose') === 'prefetch' ||
      req.get('Purpose') === 'prefetch' ||
      req.get('X-Moz') === 'prefetch';

    // Generate hashes for deduplication
    const secret = process.env.SHARE_SECRET || 'default-secret';
    const ipHash = this.shareService.generateIpHash(ip, userAgent, secret);
    const uaHash = this.shareService.generateUaHash(userAgent);

    // Detect bot
    const isBot = this.shareService.isBot(userAgent);

    // Check for self-click (owner == viewer)
    const isSelfClick =
      (req as Request).user && (req as Request).user.id === shareLink.userId;

    // Determine if click is countable
    const isCountable = !isBot && !isPrefetch && !isSelfClick;

    // Track the click
    await this.shareService.trackClick(shareLink.id, session.id, {
      event: isPrefetch ? 'prefetch' : 'click',
      referrer,
      userAgent,
      country,
      ipHash,
      uaHash,
      isBot,
      isCountable,
    });

    // Set session cookie (7 days)
    res.cookie('sid', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Build redirect URL with UTM parameters based on content type
    const redirectUrl = await this.buildRedirectUrl(shareLink, code);

    // Redirect to article
    res.redirect(302, redirectUrl);
  }

  /**
   * Record attribution for a user
   *
   * @param attributionData - Attribution data
   * @returns Success response
   */
  @Post('attribution')
  async recordAttribution(@Body() attributionData: ShareAttributionDto) {
    const session = await this.shareService.getSessionByToken(
      attributionData.sessionToken,
    );
    if (!session) {
      throw new HttpException('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    await this.shareAttributionService.recordAttribution({
      ...attributionData,
      shareId: session.shareId,
    });

    return { success: true };
  }

  /**
   * Record a conversion
   *
   * @param conversionData - Conversion data
   * @returns Success response
   */
  @Post('convert')
  async recordConversion(@Body() conversionData: ShareConversionDto) {
    const session = await this.shareService.getSessionByToken(
      conversionData.sessionToken,
    );
    if (!session) {
      throw new HttpException('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    await this.shareAttributionService.recordConversion({
      ...conversionData,
      shareId: session.shareId,
    });

    return { success: true };
  }

  /**
   * Build redirect URL based on content type
   *
   * @param shareLink - Share link with resolved content
   * @param code - Share link code
   * @returns Redirect URL with UTM parameters
   */
  private async buildRedirectUrl(
    shareLink: ShareLink,
    code: string,
  ): Promise<string> {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const utmParams = new URLSearchParams({
      utm_source: 'share',
      utm_medium: shareLink.channel?.name || 'unknown',
      utm_campaign: shareLink.campaign?.name || 'default',
      utm_content: code,
    });

    let targetUrl: string;

    switch (shareLink.contentType) {
      case SHARE_CONSTANTS.CONTENT_TYPES.ARTICLE:
        targetUrl = `${baseUrl}/articles/${shareLink.content?.slug as string}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.USER:
        targetUrl = `${baseUrl}/users/${shareLink.content?.username as string}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.MEDIA:
        targetUrl = `${baseUrl}/media/${shareLink.contentId}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.COMMENT:
        // Redirect to the article containing the comment
        targetUrl = `${baseUrl}/articles/${shareLink.content?.slug}#comment-${shareLink.contentId}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.BOOKMARK_FOLDER:
        targetUrl = `${baseUrl}/bookmarks/folders/${shareLink.contentId}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.STICKER_PACK:
        targetUrl = `${baseUrl}/stickers/packs/${shareLink.contentId}`;
        break;

      case SHARE_CONSTANTS.CONTENT_TYPES.QR_TICKET:
        targetUrl = `${baseUrl}/qr/tickets/${shareLink.contentId}`;
        break;

      default:
        // Fallback to generic content page
        targetUrl = `${baseUrl}/content/${shareLink.contentType}/${shareLink.contentId}`;
    }

    return `${targetUrl}?${utmParams.toString()}`;
  }
}
