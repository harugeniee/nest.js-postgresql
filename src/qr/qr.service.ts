import {
  QR_ERROR_MESSAGES,
  QR_REDIS_PREFIXES,
  QR_TTL_DEFAULTS,
  QrActionType,
  QrGrant,
  QrTicket,
  QrTicketPreview,
  QrTicketStatus,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateTicketDto } from './dto';
import { QrActionExecutorService } from './qr-action-executor.service';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateDeepLink,
  generateGrantToken,
  generateTicketId,
  isValidTicketId,
  sanitizePayload,
  verifyCodeChallenge,
} from './qr.utils';

/**
 * QR Service - Core business logic for QR Actions feature
 *
 * This service handles:
 * - QR ticket creation and management
 * - PKCE code challenge/verifier validation
 * - Ticket status transitions
 * - Grant token generation and management
 * - Action execution coordination
 * - Redis-based state management
 */
@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly ticketTtl: number;
  private readonly grantTtl: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly actionExecutor: QrActionExecutorService,
    private readonly configService: ConfigService,
  ) {
    // Get TTL values from configuration with fallbacks
    this.ticketTtl =
      this.configService.get<number>('QR_TICKET_TTL_SECONDS') ||
      QR_TTL_DEFAULTS.TICKET;
    this.grantTtl =
      this.configService.get<number>('QR_GRANT_TTL_SECONDS') ||
      QR_TTL_DEFAULTS.GRANT;

    this.logger.log(
      `QR Service initialized with ticket TTL: ${this.ticketTtl}s, grant TTL: ${this.grantTtl}s`,
    );
  }

  /**
   * Creates a new QR ticket for the specified action
   *
   * @param createTicketDto - DTO containing action type and payload
   * @param webSessionId - Optional web session identifier
   * @returns Object containing ticket ID, code challenge, QR content, and status
   */
  async createTicket(
    createTicketDto: CreateTicketDto,
    webSessionId?: string,
  ): Promise<{
    ticketId: string;
    codeChallenge: string;
    qrContent: string;
    status: QrTicketStatus;
  }> {
    this.logger.log(`Creating QR ticket for action: ${createTicketDto.type}`);

    // Generate secure random values
    const ticketId = generateTicketId();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Create ticket object
    const ticket: QrTicket = {
      tid: ticketId,
      type: createTicketDto.type,
      status: 'PENDING',
      codeChallenge,
      webSessionId,
      payload: createTicketDto.payload,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ticketTtl * 1000,
    };

    // Store ticket in Redis with TTL
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
    await this.cacheService.set(ticketKey, ticket, this.ticketTtl);

    // Generate QR content (deep link)
    const qrContent = generateDeepLink(ticketId, codeChallenge, {
      scheme: 'app',
      baseUrl:
        this.configService.get<string>('APP_URL') || 'https://example.com',
      path: 'qr',
      useHttpsFallback: true,
    });

    this.logger.log(`QR ticket created successfully: ${ticketId}`);

    return {
      ticketId,
      codeChallenge,
      qrContent,
      status: ticket.status,
    };
  }

  /**
   * Retrieves a ticket by ID
   *
   * @param ticketId - The ticket ID to retrieve
   * @returns The ticket object or null if not found
   */
  async getTicket(ticketId: string): Promise<QrTicket | null> {
    if (!isValidTicketId(ticketId)) {
      throw new BadRequestException('Invalid ticket ID format');
    }

    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
    const ticket = await this.cacheService.get<QrTicket>(ticketKey);

    if (!ticket) {
      return null;
    }

    // Check if ticket has expired
    if (Date.now() > ticket.expiresAt) {
      ticket.status = 'EXPIRED';
      await this.cacheService.set(ticketKey, ticket, this.ticketTtl);
    }

    return ticket;
  }

  /**
   * Gets a safe preview of a ticket for mobile clients
   *
   * @param ticketId - The ticket ID to get preview for
   * @returns Safe preview data without sensitive information
   */
  async getTicketPreview(ticketId: string): Promise<QrTicketPreview> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException(QR_ERROR_MESSAGES.TICKET_NOT_FOUND);
    }

    const isExpired = Date.now() > ticket.expiresAt;

    return {
      type: ticket.type,
      payloadPreview: ticket.payload
        ? sanitizePayload(ticket.payload)
        : undefined,
      status: isExpired ? 'EXPIRED' : ticket.status,
      isExpired,
    };
  }

  /**
   * Marks a ticket as scanned by a user
   *
   * @param ticketId - The ticket ID to mark as scanned
   * @param userId - The user ID who scanned the ticket
   * @returns True if successful
   */
  async scanTicket(ticketId: string, userId: string): Promise<boolean> {
    this.logger.log(`Marking ticket ${ticketId} as scanned by user ${userId}`);

    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException(QR_ERROR_MESSAGES.TICKET_NOT_FOUND);
    }

    // Validate ticket status
    if (ticket.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot scan ticket with status: ${ticket.status}`,
      );
    }

    // Check if ticket has expired
    if (Date.now() > ticket.expiresAt) {
      ticket.status = 'EXPIRED';
      const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
      await this.cacheService.set(ticketKey, ticket, this.ticketTtl);
      throw new BadRequestException(QR_ERROR_MESSAGES.TICKET_EXPIRED);
    }

    // Update ticket status
    ticket.status = 'SCANNED';
    ticket.scannedBy = userId;
    ticket.scannedAt = Date.now();

    // Store updated ticket
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
    await this.cacheService.set(ticketKey, ticket, this.ticketTtl);

    this.logger.log(`Ticket ${ticketId} marked as scanned successfully`);

    return true;
  }

  /**
   * Approves a ticket and executes the associated action
   *
   * @param ticketId - The ticket ID to approve
   * @param userId - The user ID who approved the ticket
   * @param codeVerifier - The PKCE code verifier
   * @returns The generated grant token
   */
  async approveTicket(
    ticketId: string,
    userId: string,
    codeVerifier: string,
  ): Promise<string> {
    this.logger.log(`Approving ticket ${ticketId} by user ${userId}`);

    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException(QR_ERROR_MESSAGES.TICKET_NOT_FOUND);
    }

    // Validate ticket status
    if (!['PENDING', 'SCANNED'].includes(ticket.status)) {
      throw new BadRequestException(
        `Cannot approve ticket with status: ${ticket.status}`,
      );
    }

    // Check if ticket has expired
    if (Date.now() > ticket.expiresAt) {
      ticket.status = 'EXPIRED';
      const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
      await this.cacheService.set(ticketKey, ticket, this.ticketTtl);
      throw new BadRequestException(QR_ERROR_MESSAGES.TICKET_EXPIRED);
    }

    // Verify PKCE code challenge
    if (!verifyCodeChallenge(codeVerifier, ticket.codeChallenge)) {
      throw new BadRequestException(QR_ERROR_MESSAGES.INVALID_CODE_VERIFIER);
    }

    // Update ticket status
    ticket.status = 'APPROVED';
    ticket.approvedBy = userId;
    ticket.approvedAt = Date.now();

    // Store updated ticket
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
    await this.cacheService.set(ticketKey, ticket, this.ticketTtl);

    // Execute the action
    try {
      await this.actionExecutor.execute(ticket.type, {
        tid: ticketId,
        userId,
        payload: ticket.payload,
        webSessionId: ticket.webSessionId,
        approvedAt: ticket.approvedAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to execute action for ticket ${ticketId}:`,
        error,
      );
      // Revert ticket status on action failure
      ticket.status = 'PENDING';
      await this.cacheService.set(ticketKey, ticket, this.ticketTtl);
      throw new BadRequestException(QR_ERROR_MESSAGES.ACTION_EXECUTION_FAILED);
    }

    // Generate grant token
    const grantToken = generateGrantToken();
    const grant: QrGrant = {
      tid: ticketId,
      type: ticket.type,
      webSessionId: ticket.webSessionId,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.grantTtl * 1000,
    };

    // Store grant in Redis with TTL
    const grantKey = `${QR_REDIS_PREFIXES.GRANT}${grantToken}`;
    await this.cacheService.set(grantKey, grant, this.grantTtl);

    this.logger.log(
      `Ticket ${ticketId} approved successfully, grant token generated`,
    );

    return grantToken;
  }

  /**
   * Rejects a ticket
   *
   * @param ticketId - The ticket ID to reject
   * @param userId - The user ID who rejected the ticket
   * @returns True if successful
   */
  async rejectTicket(ticketId: string, userId: string): Promise<boolean> {
    this.logger.log(`Rejecting ticket ${ticketId} by user ${userId}`);

    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException(QR_ERROR_MESSAGES.TICKET_NOT_FOUND);
    }

    // Validate ticket status
    if (!['PENDING', 'SCANNED'].includes(ticket.status)) {
      throw new BadRequestException(
        `Cannot reject ticket with status: ${ticket.status}`,
      );
    }

    // Update ticket status
    ticket.status = 'REJECTED';

    // Store updated ticket
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${ticketId}`;
    await this.cacheService.set(ticketKey, ticket, this.ticketTtl);

    this.logger.log(`Ticket ${ticketId} rejected successfully`);

    return true;
  }

  /**
   * Exchanges a grant token for ticket information
   *
   * @param grantToken - The grant token to exchange
   * @returns The grant information
   */
  async exchangeGrant(grantToken: string): Promise<QrGrant> {
    this.logger.log(`Exchanging grant token: ${grantToken}`);

    const grantKey = `${QR_REDIS_PREFIXES.GRANT}${grantToken}`;
    const grant = await this.cacheService.get<QrGrant>(grantKey);

    if (!grant) {
      throw new NotFoundException('Grant token not found or expired');
    }

    // Check if grant has expired
    if (Date.now() > grant.expiresAt) {
      throw new BadRequestException('Grant token has expired');
    }

    // Get the associated ticket
    const ticket = await this.getTicket(grant.tid);
    if (!ticket) {
      throw new NotFoundException('Associated ticket not found');
    }

    // Mark ticket as used
    ticket.status = 'USED';
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${grant.tid}`;
    await this.cacheService.set(ticketKey, ticket, this.ticketTtl);

    // Delete the grant token (one-time use)
    await this.cacheService.delete(grantKey);

    this.logger.log(`Grant token ${grantToken} exchanged successfully`);

    return grant;
  }

  /**
   * Cleans up expired tickets and grants
   * This method can be called periodically to clean up expired data
   *
   * @returns Number of cleaned up items
   */
  async cleanupExpired(): Promise<{ tickets: number; grants: number }> {
    this.logger.log('Starting cleanup of expired QR tickets and grants');

    let cleanedTickets = 0;
    let cleanedGrants = 0;

    try {
      // Clean up expired tickets
      const ticketPattern = `${QR_REDIS_PREFIXES.TICKET}*`;
      const expiredTickets =
        await this.cacheService.findKeysByPattern(ticketPattern);

      for (const ticketKey of expiredTickets) {
        const ticket = await this.cacheService.get<QrTicket>(ticketKey);
        if (ticket && Date.now() > ticket.expiresAt) {
          await this.cacheService.delete(ticketKey);
          cleanedTickets++;
        }
      }

      // Clean up expired grants
      const grantPattern = `${QR_REDIS_PREFIXES.GRANT}*`;
      const expiredGrants =
        await this.cacheService.findKeysByPattern(grantPattern);

      for (const grantKey of expiredGrants) {
        const grant = await this.cacheService.get<QrGrant>(grantKey);
        if (grant && Date.now() > grant.expiresAt) {
          await this.cacheService.delete(grantKey);
          cleanedGrants++;
        }
      }

      this.logger.log(
        `Cleanup completed: ${cleanedTickets} tickets, ${cleanedGrants} grants removed`,
      );
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }

    return { tickets: cleanedTickets, grants: cleanedGrants };
  }

  /**
   * Gets statistics about QR tickets and grants
   *
   * @returns Object containing various statistics
   */
  async getStats(): Promise<{
    totalTickets: number;
    activeTickets: number;
    totalGrants: number;
    activeGrants: number;
    actionTypeBreakdown: Record<QrActionType, number>;
  }> {
    try {
      const ticketPattern = `${QR_REDIS_PREFIXES.TICKET}*`;
      const grantPattern = `${QR_REDIS_PREFIXES.GRANT}*`;

      const [ticketKeys, grantKeys] = await Promise.all([
        this.cacheService.findKeysByPattern(ticketPattern),
        this.cacheService.findKeysByPattern(grantPattern),
      ]);

      const totalTickets = ticketKeys.length;
      const totalGrants = grantKeys.length;

      // Get detailed ticket information for statistics
      let activeTickets = 0;
      const actionTypeBreakdown: Record<QrActionType, number> = {
        [QrActionType.LOGIN]: 0,
        [QrActionType.ADD_FRIEND]: 0,
        [QrActionType.JOIN_ORG]: 0,
        [QrActionType.PAIR]: 0,
      };

      for (const ticketKey of ticketKeys) {
        const ticket = await this.cacheService.get<QrTicket>(ticketKey);
        if (
          ticket &&
          Date.now() <= ticket.expiresAt &&
          ticket.status !== 'USED'
        ) {
          activeTickets++;
          actionTypeBreakdown[ticket.type]++;
        }
      }

      // Count active grants
      let activeGrants = 0;
      for (const grantKey of grantKeys) {
        const grant = await this.cacheService.get<QrGrant>(grantKey);
        if (grant && Date.now() <= grant.expiresAt) {
          activeGrants++;
        }
      }

      return {
        totalTickets,
        activeTickets,
        totalGrants,
        activeGrants,
        actionTypeBreakdown,
      };
    } catch (error) {
      this.logger.error('Error getting QR statistics:', error);
      return {
        totalTickets: 0,
        activeTickets: 0,
        totalGrants: 0,
        activeGrants: 0,
        actionTypeBreakdown: {
          [QrActionType.LOGIN]: 0,
          [QrActionType.ADD_FRIEND]: 0,
          [QrActionType.JOIN_ORG]: 0,
          [QrActionType.PAIR]: 0,
        },
      };
    }
  }
}
