import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QR_ROOM_PREFIX, QR_WS_EVENTS } from './qr.constants';
import { QrService } from './qr.service';
import { QrStatusEvent, QrTicketStatus } from './qr.types';

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
export class QrGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QrGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>(); // clientId -> Set<roomNames>

  constructor(private readonly qrService: QrService) {}

  /**
   * Handles new WebSocket connections
   *
   * @param client - The connected socket client
   */
  async handleConnection(client: Socket): Promise<void> {
    const clientId = client.id;
    this.logger.log(`Client connected: ${clientId}`);

    // Initialize client's room tracking
    this.connectedClients.set(clientId, new Set());

    // Send connection confirmation
    client.emit('qr:connected', {
      clientId,
      timestamp: Date.now(),
      message: 'Connected to QR WebSocket gateway',
    });
  }

  /**
   * Handles WebSocket disconnections
   *
   * @param client - The disconnected socket client
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);

    // Clean up client's room subscriptions
    const clientRooms = this.connectedClients.get(clientId);
    if (clientRooms) {
      for (const roomName of clientRooms) {
        await client.leave(roomName);
        this.logger.debug(`Client ${clientId} left room: ${roomName}`);
      }
      this.connectedClients.delete(clientId);
    }
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
      // Validate ticket exists
      const ticket = await this.qrService.getTicket(ticketId);
      if (!ticket) {
        client.emit('qr:error', {
          message: 'Ticket not found',
          ticketId,
          timestamp: Date.now(),
        });
        return;
      }

      // Join the ticket's room
      const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
      await client.join(roomName);

      // Track client's room subscription
      const clientRooms = this.connectedClients.get(clientId) || new Set();
      clientRooms.add(roomName);
      this.connectedClients.set(clientId, clientRooms);

      // Send confirmation
      client.emit('qr:subscribed', {
        ticketId,
        roomName,
        timestamp: Date.now(),
        message: `Subscribed to ticket ${ticketId}`,
      });

      // Send current ticket status
      client.emit('qr:status:update', {
        tid: ticketId,
        status: ticket.status,
        timestamp: Date.now(),
        message: `Current status: ${ticket.status}`,
      });

      this.logger.log(`Client ${clientId} subscribed to ticket ${ticketId}`);
    } catch (error) {
      this.logger.error(
        `Error subscribing client ${clientId} to ticket ${ticketId}:`,
        error,
      );
      client.emit('qr:error', {
        message: 'Failed to subscribe to ticket',
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
      // Leave the ticket's room
      const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
      await client.leave(roomName);

      // Update client's room tracking
      const clientRooms = this.connectedClients.get(clientId);
      if (clientRooms) {
        clientRooms.delete(roomName);
      }

      // Send confirmation
      client.emit('qr:unsubscribed', {
        ticketId,
        roomName,
        timestamp: Date.now(),
        message: `Unsubscribed from ticket ${ticketId}`,
      });

      this.logger.log(
        `Client ${clientId} unsubscribed from ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error unsubscribing client ${clientId} from ticket ${ticketId}:`,
        error,
      );
      client.emit('qr:error', {
        message: 'Failed to unsubscribe from ticket',
        ticketId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Broadcasts a status update to all clients subscribed to a specific ticket
   *
   * @param ticketId - The ticket ID to broadcast to
   * @param statusEvent - The status event to broadcast
   */
  async broadcastStatusUpdate(
    ticketId: string,
    statusEvent: QrStatusEvent,
  ): Promise<void> {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;

    try {
      // Emit to all clients in the room
      this.server.to(roomName).emit(QR_WS_EVENTS.STATUS_UPDATE, statusEvent);

      this.logger.debug(
        `Status update broadcasted to room ${roomName}:`,
        statusEvent,
      );
    } catch (error) {
      this.logger.error(
        `Error broadcasting status update to room ${roomName}:`,
        error,
      );
    }
  }

  /**
   * Broadcasts a status update to all clients subscribed to a specific ticket
   * This is a convenience method that creates the status event object
   *
   * @param ticketId - The ticket ID to broadcast to
   * @param status - The new status
   * @param message - Optional message describing the status change
   */
  async broadcastStatus(
    ticketId: string,
    status: QrTicketStatus,
    message?: string,
  ): Promise<void> {
    const statusEvent: QrStatusEvent = {
      tid: ticketId,
      status,
      message: message || `Status changed to: ${status}`,
      timestamp: Date.now(),
    };

    await this.broadcastStatusUpdate(ticketId, statusEvent);
  }

  /**
   * Gets information about connected clients and their subscriptions
   *
   * @returns Object containing connection statistics
   */
  getConnectionStats(): {
    totalClients: number;
    totalRooms: number;
    clientSubscriptions: Record<string, string[]>;
  } {
    const totalClients = this.connectedClients.size;
    const allRooms = new Set<string>();
    const clientSubscriptions: Record<string, string[]> = {};

    for (const [clientId, rooms] of this.connectedClients.entries()) {
      const roomArray = Array.from(rooms);
      clientSubscriptions[clientId] = roomArray;
      roomArray.forEach((room) => allRooms.add(room));
    }

    return {
      totalClients,
      totalRooms: allRooms.size,
      clientSubscriptions,
    };
  }

  /**
   * Gets the number of clients subscribed to a specific ticket
   *
   * @param ticketId - The ticket ID to check
   * @returns Number of subscribed clients
   */
  getTicketSubscriberCount(ticketId: string): number {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }

  /**
   * Disconnects all clients from a specific ticket room
   * Useful for cleanup when a ticket is completed or expired
   *
   * @param ticketId - The ticket ID to disconnect clients from
   */
  async disconnectTicketClients(ticketId: string): Promise<void> {
    const roomName = `${QR_ROOM_PREFIX}${ticketId}`;

    try {
      // Get all clients in the room
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        // Send final status update before disconnecting
        const finalEvent: QrStatusEvent = {
          tid: ticketId,
          status: 'USED',
          message: 'Ticket completed, disconnecting clients',
          timestamp: Date.now(),
        };

        this.server.to(roomName).emit(QR_WS_EVENTS.STATUS_UPDATE, finalEvent);

        // Disconnect all clients from the room
        for (const clientId of room) {
          const client = this.server.sockets.sockets.get(clientId);
          if (client) {
            await client.leave(roomName);

            // Update client's room tracking
            const clientRooms = this.connectedClients.get(clientId);
            if (clientRooms) {
              clientRooms.delete(roomName);
            }
          }
        }
      }

      this.logger.log(`Disconnected all clients from ticket ${ticketId}`);
    } catch (error) {
      this.logger.error(
        `Error disconnecting clients from ticket ${ticketId}:`,
        error,
      );
    }
  }
}
