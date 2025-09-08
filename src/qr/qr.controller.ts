import { Request, Response } from 'express';
import { JwtAccessTokenGuard } from 'src/auth/guard';
import { AuthPayload } from 'src/common/interface';
import {
  QrActionType,
  QR_ACTION_TYPES,
  QR_POLLING_CONFIG,
} from 'src/shared/constants';
import { buildResponse } from 'src/shared/helpers/build-response';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import {
  ApproveTicketDto,
  CreateTicketDto,
  QrPollResponseDto,
  QrGrantExchangeDto,
} from './dto';
import { QrGateway } from './qr.gateway';
import { QrService } from './qr.service';
import { QrPollingService } from './qr-polling.service';
import { QrPollingRateLimitGuard } from './guards/qr-polling-rate-limit.guard';

/**
 * QR Controller - REST API endpoints for QR Actions feature
 *
 * This controller provides endpoints for:
 * - Creating QR tickets
 * - Retrieving ticket information
 * - Scanning and approving tickets
 * - Exchanging grant tokens for JWT
 * - Getting QR statistics
 *
 * Security:
 * - Public endpoints: create ticket, get ticket preview, exchange grant
 * - Protected endpoints: scan, approve, reject (require JWT authentication)
 * - Rate limiting applied to public endpoints
 */
@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly qrGateway: QrGateway,
    private readonly pollingService: QrPollingService,
  ) {}

  /**
   * Creates a new QR ticket for the specified action
   *
   * @param createTicketDto - DTO containing action type and payload
   * @param req - Express request object
   * @returns Object containing ticket ID, code challenge, QR content, and status
   *
   * @example
   * POST /qr/tickets
   * {
   *   "type": "LOGIN",
   *   "payload": {},
   *   "webSessionId": "session_123"
   * }
   */
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: Request,
  ) {
    // Extract web session ID from request (could be from cookie, header, or body)
    const webSessionId: string | undefined =
      createTicketDto.webSessionId ||
      (req.headers['x-web-session-id'] as string) ||
      (req.cookies as Record<string, string>)?.['web-session-id'];

    // Create the ticket
    const ticket = await this.qrService.createTicket(
      createTicketDto,
      webSessionId,
    );

    // Broadcast status update to any connected clients
    await this.qrGateway.broadcastStatus(
      ticket.ticketId,
      ticket.status,
      'QR ticket created',
    );

    return buildResponse({
      messageKey: 'qr.TICKET_CREATED_SUCCESS',
      data: ticket,
    });
  }

  /**
   * Gets a safe preview of a ticket for mobile clients
   *
   * @param ticketId - The ticket ID to get preview for
   * @returns Safe preview data without sensitive information
   *
   * @example
   * GET /qr/tickets/abc123
   */
  @Get('tickets/:ticketId')
  async getTicketPreview(@Param('ticketId') ticketId: string) {
    const preview = await this.qrService.getTicketPreview(ticketId);

    return buildResponse({
      messageKey: 'qr.TICKET_PREVIEW_RETRIEVED',
      data: preview,
    });
  }

  /**
   * Marks a ticket as scanned by a user
   * Requires JWT authentication
   *
   * @param ticketId - The ticket ID to mark as scanned
   * @param req - Express request object with authenticated user
   * @returns Success confirmation
   *
   * @example
   * POST /qr/tickets/abc123/scan
   * Authorization: Bearer <jwt_token>
   */
  @Post('tickets/:ticketId/scan')
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async scanTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: Request & { user: AuthPayload },
  ) {
    const userId = req.user.uid;

    // Mark ticket as scanned
    await this.qrService.scanTicket(ticketId, userId);

    // Broadcast status update
    await this.qrGateway.broadcastStatus(
      ticketId,
      'SCANNED',
      'QR code scanned by user',
    );

    return buildResponse({
      messageKey: 'qr.TICKET_SCANNED_SUCCESS',
      data: { ok: true },
    });
  }

  /**
   * Approves a ticket and executes the associated action
   * Requires JWT authentication
   *
   * @param ticketId - The ticket ID to approve
   * @param approveTicketDto - DTO containing the PKCE code verifier
   * @param req - Express request object with authenticated user
   * @returns Success confirmation (grant token is stored server-side)
   *
   * @example
   * POST /qr/tickets/abc123/approve
   * Authorization: Bearer <jwt_token>
   * {
   *   "codeVerifier": "base64url_encoded_verifier"
   * }
   */
  @Post('tickets/:ticketId/approve')
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async approveTicket(
    @Param('ticketId') ticketId: string,
    @Body() approveTicketDto: ApproveTicketDto,
    @Req() req: Request & { user: AuthPayload },
  ) {
    const userId = req.user.uid;
    const { codeVerifier } = approveTicketDto;

    // Approve the ticket and execute the action
    await this.qrService.approveTicket(ticketId, userId, codeVerifier);

    // Broadcast status update
    await this.qrGateway.broadcastStatus(
      ticketId,
      'APPROVED',
      'Action approved, grant token generated',
    );

    return buildResponse({
      messageKey: 'qr.TICKET_APPROVED_SUCCESS',
      data: { ok: true },
    });
  }

  /**
   * Rejects a ticket
   * Requires JWT authentication
   *
   * @param ticketId - The ticket ID to reject
   * @param req - Express request object with authenticated user
   * @returns Success confirmation
   *
   * @example
   * POST /qr/tickets/abc123/reject
   * Authorization: Bearer <jwt_token>
   */
  @Post('tickets/:ticketId/reject')
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async rejectTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: Request & { user: AuthPayload },
  ) {
    const userId = req.user.uid;

    // Reject the ticket
    await this.qrService.rejectTicket(ticketId, userId);

    // Broadcast status update
    await this.qrGateway.broadcastStatus(
      ticketId,
      'REJECTED',
      'Action rejected by user',
    );

    return buildResponse({
      messageKey: 'qr.TICKET_REJECTED_SUCCESS',
      data: { ok: true },
    });
  }

  /**
   * Exchanges a grant token or delivery code for ticket information
   * This endpoint supports both legacy grantToken and new deliveryCode methods
   *
   * @param body - Object containing ticket ID and either grant token or delivery code
   * @returns Grant information for JWT generation
   *
   * @example
   * POST /auth/qr/grant
   * {
   *   "tid": "abc123",
   *   "grantToken": "base64url_encoded_grant"
   * }
   *
   * OR
   *
   * {
   *   "tid": "abc123",
   *   "deliveryCode": "base64url_encoded_delivery_code"
   * }
   */
  @Post('auth/qr/grant')
  @HttpCode(HttpStatus.OK)
  async exchangeGrant(@Body() body: QrGrantExchangeDto) {
    const { tid, grantToken, deliveryCode } = body;

    if (!tid) {
      throw new BadRequestException('Ticket ID is required');
    }

    if (!grantToken && !deliveryCode) {
      throw new BadRequestException(
        'Either grant token or delivery code is required',
      );
    }

    if (grantToken && deliveryCode) {
      throw new BadRequestException(
        'Cannot provide both grant token and delivery code',
      );
    }

    let grant;

    if (grantToken) {
      // Legacy grant token exchange
      grant = await this.qrService.exchangeGrant(grantToken);

      // Verify the grant matches the requested ticket
      if (grant.tid !== tid) {
        throw new BadRequestException(
          'Grant token does not match the requested ticket',
        );
      }
    } else if (deliveryCode) {
      // New delivery code exchange
      grant = await this.qrService.exchangeDeliveryCode(tid, deliveryCode);
    }

    // Broadcast completion status
    await this.qrGateway.broadcastStatus(
      tid,
      'USED',
      'Grant exchanged, ticket completed',
    );

    // TODO: Generate JWT tokens using AuthService
    // This should integrate with your existing authentication system
    // const tokens = await this.authService.generateTokensFromQrGrant(grant);

    // For now, return the grant information
    // In a real implementation, you would return JWT tokens
    return buildResponse({
      messageKey: 'qr.GRANT_EXCHANGED_SUCCESS',
      data: {
        grant,
        // accessToken: tokens.accessToken,
        // refreshToken: tokens.refreshToken,
        message:
          'Grant exchanged successfully. JWT generation not yet implemented.',
      },
    });
  }

  /**
   * Short-poll endpoint for checking QR ticket status
   * Returns current status immediately with suggested next poll interval
   *
   * @param ticketId - The ticket ID to poll
   * @param webSessionId - The web session ID (required for deliveryCode)
   * @param req - Express request object
   * @param res - Express response object
   * @returns Current ticket status and polling information
   *
   * @example
   * GET /qr/tickets/abc123/poll?webSessionId=session_123
   */
  @Get('tickets/:ticketId/poll')
  @UseGuards(QrPollingRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async pollTicket(
    @Param('ticketId') ticketId: string,
    @Query('webSessionId') webSessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<QrPollResponseDto> {
    if (!webSessionId) {
      throw new BadRequestException('webSessionId query parameter is required');
    }

    // Read ticket snapshot
    const snapshot = await this.pollingService.readTicketSnapshot(ticketId);
    if (!snapshot) {
      throw new BadRequestException('Ticket not found');
    }

    // Generate ETag
    const etag = this.makeEtag(ticketId, snapshot.version);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    // Check If-None-Match for 304 response
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      throw new HttpException('Not Modified', HttpStatus.NOT_MODIFIED);
    }

    // Try to get delivery code if ticket is approved
    let deliveryCode: string | null = null;
    let grantReady = false;

    if (snapshot.status === 'APPROVED') {
      deliveryCode = await this.pollingService.tryGetDeliveryCode(
        ticketId,
        webSessionId,
      );
      grantReady = !!deliveryCode;
    }

    const response: QrPollResponseDto = {
      tid: ticketId,
      status: snapshot.status,
      expiresAt: new Date(snapshot.expiresAt).toISOString(),
      scannedAt: snapshot.scannedAt
        ? new Date(snapshot.scannedAt).toISOString()
        : undefined,
      approvedAt: snapshot.approvedAt
        ? new Date(snapshot.approvedAt).toISOString()
        : undefined,
      rejectedAt: snapshot.rejectedAt
        ? new Date(snapshot.rejectedAt).toISOString()
        : undefined,
      usedAt: snapshot.usedAt
        ? new Date(snapshot.usedAt).toISOString()
        : undefined,
      grantReady,
      deliveryCode: grantReady && deliveryCode ? deliveryCode : undefined,
      nextPollAfterMs: QR_POLLING_CONFIG.SHORT_POLL_INTERVAL_MS,
      version: snapshot.version,
    };

    return response;
  }

  /**
   * Long-poll endpoint for waiting for QR ticket status changes
   * Hangs the connection for up to 25 seconds waiting for status changes
   *
   * @param ticketId - The ticket ID to poll
   * @param webSessionId - The web session ID (required for deliveryCode)
   * @param req - Express request object
   * @param res - Express response object
   * @returns Current ticket status and polling information
   *
   * @example
   * GET /qr/tickets/abc123/long-poll?webSessionId=session_123
   * If-None-Match: W/"abc123:5"
   */
  @Get('tickets/:ticketId/long-poll')
  @UseGuards(QrPollingRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async longPollTicket(
    @Param('ticketId') ticketId: string,
    @Query('webSessionId') webSessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<QrPollResponseDto> {
    if (!webSessionId) {
      throw new BadRequestException('webSessionId query parameter is required');
    }

    // Parse If-None-Match to get sinceVersion
    const ifNoneMatch = req.headers['if-none-match'];
    const sinceVersion = this.parseIfNoneMatch(ifNoneMatch)?.version || 0;

    // Read current snapshot
    const snapshot = await this.pollingService.readTicketSnapshot(ticketId);
    if (!snapshot) {
      throw new BadRequestException('Ticket not found');
    }

    // If version hasn't changed, wait for changes
    if (snapshot.version <= sinceVersion) {
      const result = await this.pollingService.waitForChangeOrTimeout({
        tid: ticketId,
        sinceVersion,
        timeoutMs: QR_POLLING_CONFIG.LONG_POLL_TIMEOUT_MS,
      });

      if (result === 'TIMEOUT') {
        // Timeout reached, return current snapshot
        const currentSnapshot =
          await this.pollingService.readTicketSnapshot(ticketId);
        if (!currentSnapshot) {
          throw new BadRequestException('Ticket not found');
        }
        return this.buildPollResponse(
          ticketId,
          currentSnapshot,
          webSessionId,
          res,
        );
      }

      // Status changed, get updated snapshot
      const updatedSnapshot =
        await this.pollingService.readTicketSnapshot(ticketId);
      if (!updatedSnapshot) {
        throw new BadRequestException('Ticket not found');
      }
      return this.buildPollResponse(
        ticketId,
        updatedSnapshot,
        webSessionId,
        res,
      );
    }

    // Version has changed since last check, return current snapshot
    return this.buildPollResponse(ticketId, snapshot, webSessionId, res);
  }

  /**
   * Builds a poll response from ticket snapshot
   */
  private async buildPollResponse(
    ticketId: string,
    snapshot: {
      status: string;
      expiresAt: number;
      version: number;
      scannedAt?: number;
      approvedAt?: number;
      rejectedAt?: number;
      usedAt?: number;
      webSessionId?: string;
    },
    webSessionId: string,
    res: Response,
  ): Promise<QrPollResponseDto> {
    // Generate ETag
    const etag = this.makeEtag(ticketId, snapshot.version);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    // Try to get delivery code if ticket is approved
    let deliveryCode: string | null = null;
    let grantReady = false;

    if (snapshot.status === 'APPROVED') {
      deliveryCode = await this.pollingService.tryGetDeliveryCode(
        ticketId,
        webSessionId,
      );
      grantReady = !!deliveryCode;
    }

    return {
      tid: ticketId,
      status: snapshot.status as any,
      expiresAt: new Date(snapshot.expiresAt).toISOString(),
      scannedAt: snapshot.scannedAt
        ? new Date(snapshot.scannedAt).toISOString()
        : undefined,
      approvedAt: snapshot.approvedAt
        ? new Date(snapshot.approvedAt).toISOString()
        : undefined,
      rejectedAt: snapshot.rejectedAt
        ? new Date(snapshot.rejectedAt).toISOString()
        : undefined,
      usedAt: snapshot.usedAt
        ? new Date(snapshot.usedAt).toISOString()
        : undefined,
      grantReady,
      deliveryCode: grantReady && deliveryCode ? deliveryCode : undefined,
      nextPollAfterMs: QR_POLLING_CONFIG.SHORT_POLL_INTERVAL_MS,
      version: snapshot.version,
    };
  }

  /**
   * Generates an ETag for a ticket and version
   */
  private makeEtag(tid: string, version: number): string {
    return `W/"${tid}:${version}"`;
  }

  /**
   * Parses If-None-Match header to extract ticket ID and version
   */
  private parseIfNoneMatch(
    ifNoneMatch?: string,
  ): { tid: string; version: number } | undefined {
    if (!ifNoneMatch) return undefined;

    const regex = /W\/"(.+):(\d+)"/;
    const match = regex.exec(ifNoneMatch);
    return match ? { tid: match[1], version: Number(match[2]) } : undefined;
  }

  /**
   * Gets statistics about QR tickets and grants
   * Useful for monitoring and debugging
   *
   * @returns Object containing various statistics
   *
   * @example
   * GET /qr/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.qrService.getStats();
    const connectionStats = this.qrGateway.getConnectionStats();

    return buildResponse({
      messageKey: 'qr.STATS_RETRIEVED_SUCCESS',
      data: {
        ...stats,
        connections: connectionStats,
      },
    });
  }

  /**
   * Gets information about supported action types
   *
   * @returns Object containing supported action types and their descriptions
   *
   * @example
   * GET /qr/actions
   */
  @Get('actions')
  async getSupportedActions() {
    const actions = Object.values(QR_ACTION_TYPES).map((type) => ({
      type,
      description: this.getActionDescription(type),
      requiresPayload: this.actionRequiresPayload(type),
    }));

    return buildResponse({
      messageKey: 'qr.ACTIONS_RETRIEVED_SUCCESS',
      data: { actions },
    });
  }

  /**
   * Gets the description for a specific action type
   *
   * @param actionType - The action type to get description for
   * @returns Description string
   */
  private getActionDescription(actionType: QrActionType): string {
    const descriptions = {
      [QR_ACTION_TYPES.LOGIN]: 'Login to the application via QR code',
      [QR_ACTION_TYPES.ADD_FRIEND]: 'Add a new friend to your network',
      [QR_ACTION_TYPES.JOIN_ORG]: 'Join an organization or group',
      [QR_ACTION_TYPES.PAIR]:
        'Pair with another device for secure communication',
    };

    return descriptions[actionType] || 'Unknown action type';
  }

  /**
   * Determines if an action type requires payload data
   *
   * @param actionType - The action type to check
   * @returns True if payload is required, false otherwise
   */
  private actionRequiresPayload(actionType: QrActionType): boolean {
    const requiresPayload = {
      [QR_ACTION_TYPES.LOGIN]: false,
      [QR_ACTION_TYPES.ADD_FRIEND]: true,
      [QR_ACTION_TYPES.JOIN_ORG]: true,
      [QR_ACTION_TYPES.PAIR]: true,
    };

    return requiresPayload[actionType] || false;
  }

  /**
   * Health check endpoint for the QR module
   *
   * @returns Health status information
   *
   * @example
   * GET /qr/health
   */
  @Get('health')
  async healthCheck() {
    try {
      // Test basic functionality
      const stats = await this.qrService.getStats();
      const connectionStats = this.qrGateway.getConnectionStats();

      return buildResponse({
        messageKey: 'qr.HEALTH_CHECK_SUCCESS',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          stats,
          connections: connectionStats,
        },
      });
    } catch (error) {
      return buildResponse({
        messageKey: 'qr.HEALTH_CHECK_FAILED',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        },
      });
    }
  }
}
