import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessTokenGuard } from 'src/auth/guard';
import { AuthPayload } from 'src/common/interface';
import { buildResponse } from 'src/shared/helpers/build-response';
import { QrService } from './qr.service';
import { QrGateway } from './qr.gateway';
import { CreateTicketDto, ApproveTicketDto } from './dto';
import { QrActionType, QrTicketStatus } from './qr.types';
import { QR_ERROR_MESSAGES } from './qr.constants';
import { QrRateLimitGuard } from './guards/qr-rate-limit.guard';

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
  @UseGuards(QrRateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: Request,
  ) {
    // Extract web session ID from request (could be from cookie, header, or body)
    const webSessionId =
      createTicketDto.webSessionId ||
      (req.headers['x-web-session-id'] as string) ||
      req.cookies?.['web-session-id'];

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
    const grantToken = await this.qrService.approveTicket(
      ticketId,
      userId,
      codeVerifier,
    );

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
   * Exchanges a grant token for ticket information
   * This endpoint is used by web clients to complete the QR flow
   *
   * @param body - Object containing ticket ID and grant token
   * @returns Grant information for JWT generation
   *
   * @example
   * POST /auth/qr/grant
   * {
   *   "tid": "abc123",
   *   "grantToken": "base64url_encoded_grant"
   * }
   */
  @Post('auth/qr/grant')
  @UseGuards(QrRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async exchangeGrant(@Body() body: { tid: string; grantToken: string }) {
    const { tid, grantToken } = body;

    if (!tid || !grantToken) {
      throw new BadRequestException('Ticket ID and grant token are required');
    }

    // Exchange the grant token
    const grant = await this.qrService.exchangeGrant(grantToken);

    // Verify the grant matches the requested ticket
    if (grant.tid !== tid) {
      throw new BadRequestException(
        'Grant token does not match the requested ticket',
      );
    }

    // Broadcast completion status
    await this.qrGateway.broadcastStatus(
      tid,
      'USED',
      'Grant token exchanged, ticket completed',
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
          'Grant token exchanged successfully. JWT generation not yet implemented.',
      },
    });
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
    const actions = Object.values(QrActionType).map((type) => ({
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
      [QrActionType.LOGIN]: 'Login to the application via QR code',
      [QrActionType.ADD_FRIEND]: 'Add a new friend to your network',
      [QrActionType.JOIN_ORG]: 'Join an organization or group',
      [QrActionType.PAIR]: 'Pair with another device for secure communication',
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
      [QrActionType.LOGIN]: false,
      [QrActionType.ADD_FRIEND]: true,
      [QrActionType.JOIN_ORG]: true,
      [QrActionType.PAIR]: true,
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
          error: error.message,
        },
      });
    }
  }
}
