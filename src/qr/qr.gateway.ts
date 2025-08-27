import { Socket } from 'socket.io';
import { BaseGateway } from 'src/common/gateways/base.gateway';
import { AuthPayload } from 'src/common/interface';
import {
  QR_ROOM_PREFIX,
  QR_WS_EVENTS,
  QrStatusEvent,
  QrTicketStatus,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';

import { QrService } from './qr.service';

/**
 * QR WebSocket Gateway with JWT Authentication using existing AuthGuard
 *
 * This gateway handles real-time communication between web clients and the QR system.
 * It allows clients to subscribe to ticket status updates and receive real-time
 * notifications when ticket states change.
 *
 * Features:
 * - JWT-based authentication using existing AuthGuard
 * - Room-based subscription per ticket ID
 * - Real-time status updates
 * - Connection management with user context
 * - Event broadcasting
 */
@WebSocketGateway({
  namespace: 'qr',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class QrGateway extends BaseGateway<
  { userId: string; permissions: string[]; email?: string },
  AuthPayload
> {
  constructor(
    private readonly qrService: QrService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super();
    // Use existing AuthGuard instead of custom authentication
    this.useCustomAuthentication = false;
  }

  /**
   * Get JWT service instance
   */
  protected getJwtService(): JwtService {
    return this.jwtService;
  }

  /**
   * Get cache service instance
   */
  protected getCacheService(): CacheService {
    return this.cacheService;
  }

  /**
   * Get config service instance
   */
  protected getConfigService(): ConfigService {
    return this.configService;
  }

  /**
   * Extract client metadata from the connection
   * For QR gateway, we extract user ID, permissions, and email from JWT payload
   *
   * @param client - The socket client
   * @param authPayload - The authenticated JWT payload
   * @returns Client metadata
   */
  protected async extractClientMetadata(
    client: Socket,
    authPayload: AuthPayload,
  ): Promise<{ userId: string; permissions: string[]; email?: string }> {
    return {
      userId: authPayload.uid,
      permissions: [],
      email: (authPayload as { email?: string }).email,
    };
  }

  /**
   * Send connection confirmation to the client
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   * @param authPayload - The authenticated JWT payload
   */
  protected async sendConnectionConfirmation(
    client: Socket,
    metadata: { userId: string; permissions: string[]; email?: string },
    authPayload: AuthPayload,
  ): Promise<void> {
    client.emit('qr:connected', {
      clientId: client.id,
      userId: metadata.userId,
      email: metadata.email,
      permissions: metadata.permissions,
      timestamp: Date.now(),
      message: 'Connected to QR WebSocket gateway',
    });
  }

  /**
   * Gets the user ID from the JWT payload
   *
   * @param authPayload - The JWT payload
   * @returns User ID string
   */
  protected getUserId(authPayload: AuthPayload): string {
    return authPayload.uid;
  }

  /**
   * Handles subscription to a ticket's status updates
   * Only authenticated clients can subscribe
   *
   * @param client - The socket client
   * @param data - Object containing ticket ID
   */
  @SubscribeMessage('qr:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ): Promise<void> {
    const { ticketId } = data;
    const clientId = client.id;

    if (!ticketId) {
      client.emit('qr:error', {
        message: 'Ticket ID is required for subscription',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // Verify the ticket exists
      const ticket = await this.qrService.getTicket(ticketId);
      if (!ticket) {
        client.emit('qr:error', {
          message: 'Ticket not found',
          ticketId,
          timestamp: Date.now(),
        });
        return;
      }

      // Join the ticket room
      const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
      const success = await this.joinRoom(clientId, roomName, client);

      if (success) {
        // Send confirmation
        client.emit('qr:subscribed', {
          ticketId,
          roomName,
          timestamp: Date.now(),
          message: 'Successfully subscribed to ticket updates',
        });

        // Send current ticket status
        client.emit(QR_WS_EVENTS.STATUS_UPDATE, {
          tid: ticketId,
          status: ticket.status,
          timestamp: Date.now(),
          message: 'Current ticket status',
        });

        this.logger.log(`Client ${clientId} subscribed to ticket ${ticketId}`);
      } else {
        client.emit('qr:error', {
          message: 'Failed to subscribe to ticket',
          ticketId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to subscribe client ${clientId} to ticket ${ticketId}:`,
        error,
      );
      client.emit('qr:error', {
        message: 'Internal server error during subscription',
        ticketId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handles unsubscription from a ticket's status updates
   *
   * @param client - The socket client
   * @param data - Object containing ticket ID
   */
  @SubscribeMessage('qr:unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ): Promise<void> {
    const { ticketId } = data;
    const clientId = client.id;

    if (!ticketId) {
      client.emit('qr:error', {
        message: 'Ticket ID is required for unsubscription',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // Leave the ticket room
      const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
      const success = await this.leaveRoom(clientId, roomName, client);

      if (success) {
        // Send confirmation
        client.emit('qr:unsubscribed', {
          ticketId,
          roomName,
          timestamp: Date.now(),
          message: 'Successfully unsubscribed from ticket updates',
        });

        this.logger.log(
          `Client ${clientId} unsubscribed from ticket ${ticketId}`,
        );
      } else {
        client.emit('qr:error', {
          message: 'Failed to unsubscribe from ticket',
          ticketId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe client ${clientId} from ticket ${ticketId}:`,
        error,
      );
      client.emit('qr:error', {
        message: 'Internal server error during unsubscription',
        ticketId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Broadcasts a status update to all clients subscribed to a specific ticket
   *
   * @param ticketId - The ticket ID
   * @param status - The new status
   * @param message - Optional message describing the status change
   * @returns Number of clients that received the update
   */
  async broadcastStatus(
    ticketId: string,
    status: QrTicketStatus,
    message?: string,
  ): Promise<number> {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
    const eventData: QrStatusEvent = {
      tid: ticketId,
      status,
      message,
      timestamp: Date.now(),
    };

    const clientCount = await this.broadcastToRoom(
      roomName,
      QR_WS_EVENTS.STATUS_UPDATE,
      eventData,
    );

    this.logger.log(
      `Broadcasted status update for ticket ${ticketId} to ${clientCount} clients: ${status}`,
    );

    return clientCount;
  }

  /**
   * Gets QR-specific connection statistics with authentication info
   *
   * @returns Object containing QR connection statistics
   */
  getQrConnectionStats(): {
    totalClients: number;
    authenticatedClients: number;
    totalRooms: number;
    clientRooms: Record<string, string[]>;
    authenticatedClientRooms: Record<string, string[]>;
    qrRooms: string[];
    nonQrRooms: string[];
    userStats: Record<string, { rooms: string[]; permissions: string[] }>;
  } {
    const baseStats = this.getConnectionStats();
    const qrRooms: string[] = [];
    const nonQrRooms: string[] = [];
    const userStats: Record<
      string,
      { rooms: string[]; permissions: string[] }
    > = {};

    // Categorize rooms and build user statistics
    for (const [clientId, rooms] of Object.entries(baseStats.clientRooms)) {
      for (const room of rooms) {
        if (room.startsWith(QR_ROOM_PREFIX)) {
          qrRooms.push(room);
        } else {
          nonQrRooms.push(room);
        }
      }

      // Build user statistics for authenticated clients
      if (this.isClientAuthenticated(clientId)) {
        const authPayload = this.getClientAuthPayload(clientId);
        const metadata = this.clientMetadata.get(clientId);

        if (authPayload && metadata) {
          const userId = this.getUserId(authPayload);
          if (!userStats[userId]) {
            userStats[userId] = {
              rooms: [],
              permissions: metadata.permissions || [],
            };
          }
          userStats[userId].rooms.push(...rooms);
        }
      }
    }

    return {
      ...baseStats,
      qrRooms: [...new Set(qrRooms)], // Remove duplicates
      nonQrRooms: [...new Set(nonQrRooms)], // Remove duplicates
      userStats,
    };
  }

  /**
   * Gets all clients subscribed to a specific ticket
   *
   * @param ticketId - The ticket ID
   * @returns Array of client IDs
   */
  getTicketSubscribers(ticketId: string): string[] {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
    return this.getClientsInRoom(roomName);
  }

  /**
   * Gets all authenticated clients subscribed to a specific ticket
   *
   * @param ticketId - The ticket ID
   * @returns Array of authenticated client IDs
   */
  getAuthenticatedTicketSubscribers(ticketId: string): string[] {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
    return this.getAuthenticatedClientsInRoom(roomName);
  }

  /**
   * Checks if a client is subscribed to a specific ticket
   *
   * @param clientId - The client ID
   * @param ticketId - The ticket ID
   * @returns True if subscribed, false otherwise
   */
  isClientSubscribedToTicket(clientId: string, ticketId: string): boolean {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
    return this.isClientInRoom(clientId, roomName);
  }

  /**
   * Gets all tickets a user is subscribed to
   *
   * @param userId - The user ID
   * @returns Array of ticket IDs
   */
  getUserSubscribedTickets(userId: string): string[] {
    const tickets: string[] = [];

    for (const [clientId, authPayload] of this.authenticatedClients.entries()) {
      if (this.getUserId(authPayload) === userId) {
        const rooms = this.getClientRooms(clientId);
        for (const room of rooms) {
          if (room.startsWith(QR_ROOM_PREFIX)) {
            const ticketId = room.replace(QR_ROOM_PREFIX, '');
            tickets.push(ticketId);
          }
        }
      }
    }

    return [...new Set(tickets)]; // Remove duplicates
  }

  /**
   * Test method to verify WebSocket exception filter functionality
   * This method throws different types of exceptions to test the filter
   *
   * @param client - The socket client
   * @param payload - Test payload
   */
  @SubscribeMessage('test_exception')
  async testException(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { type: string; messageKey?: string },
  ): Promise<void> {
    const { type, messageKey } = payload;

    switch (type) {
      case 'i18n':
        // Test exception with internationalization
        throw new WsException({
          messageKey: messageKey || 'qr.test.error',
          messageArgs: { action: 'test', type: 'i18n' },
          code: 'TEST_I18N_ERROR',
        });

      case 'simple':
        // Test simple exception
        throw new WsException('Simple test error message');

      case 'detailed':
        // Test detailed exception
        throw new WsException({
          message: 'Detailed test error',
          code: 'TEST_DETAILED_ERROR',
          data: { timestamp: Date.now(), clientId: client.id },
        });

      default:
        // Test default exception
        throw new WsException({
          messageKey: 'qr.test.unknown',
          message: 'Unknown test type',
        });
    }
  }
}
