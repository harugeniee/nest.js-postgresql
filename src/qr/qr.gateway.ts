import { Server, Socket } from 'socket.io';
import {
  QR_ROOM_PREFIX,
  QR_WS_EVENTS,
  QrStatusEvent,
  QrTicketStatus,
} from 'src/shared/constants';
import { BaseGateway } from 'src/common/gateways/base.gateway';

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

import { QrService } from './qr.service';

/**
 * QR WebSocket Gateway
 *
 * This gateway handles real-time communication between web clients and the QR system.
 * It allows clients to subscribe to ticket status updates and receive real-time
 * notifications when ticket states change.
 *
 * Features:
 * - Room-based subscription per ticket ID
 * - Real-time status updates
 * - Connection management
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
export class QrGateway extends BaseGateway<{
  userId?: string;
  permissions?: string[];
}> {
  constructor(private readonly qrService: QrService) {
    super();
  }

  /**
   * Extract client metadata from the connection
   * For QR gateway, we extract user ID and permissions if available
   *
   * @param client - The socket client
   * @returns Client metadata
   */
  protected async extractClientMetadata(
    client: Socket,
  ): Promise<{ userId?: string; permissions?: string[] }> {
    // Extract user ID from handshake auth if available
    const userId = (client.handshake.auth as { userId?: string })?.userId;
    const permissions =
      (client.handshake.auth as { permissions?: string[] })?.permissions || [];

    return { userId, permissions };
  }

  /**
   * Send connection confirmation to the client
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   */
  protected async sendConnectionConfirmation(
    client: Socket,
    metadata: { userId?: string; permissions?: string[] },
  ): Promise<void> {
    client.emit('qr:connected', {
      clientId: client.id,
      timestamp: Date.now(),
      message: 'Connected to QR WebSocket gateway',
      userId: metadata.userId,
      permissions: metadata.permissions,
    });
  }

  /**
   * Handles subscription to a ticket's status updates
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
   * Gets QR-specific connection statistics
   *
   * @returns Object containing QR connection statistics
   */
  getQrConnectionStats(): {
    totalClients: number;
    totalRooms: number;
    clientRooms: Record<string, string[]>;
    qrRooms: string[];
    nonQrRooms: string[];
  } {
    const baseStats = this.getConnectionStats();
    const qrRooms: string[] = [];
    const nonQrRooms: string[] = [];

    // Categorize rooms
    for (const [clientId, rooms] of Object.entries(baseStats.clientRooms)) {
      for (const room of rooms) {
        if (room.startsWith(QR_ROOM_PREFIX)) {
          qrRooms.push(room);
        } else {
          nonQrRooms.push(room);
        }
      }
    }

    return {
      ...baseStats,
      qrRooms: [...new Set(qrRooms)], // Remove duplicates
      nonQrRooms: [...new Set(nonQrRooms)], // Remove duplicates
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
}
