import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

/**
 * Base WebSocket Gateway
 *
 * This abstract class provides common WebSocket functionality that can be
 * inherited by specific gateway implementations. It handles:
 * - Connection management
 * - Client tracking
 * - Room management
 * - Event broadcasting
 * - Error handling
 * - Logging
 *
 * @template T - Type for client metadata (e.g., user info, permissions)
 */
@WebSocketGateway()
export abstract class BaseGateway<T = Record<string, any>>
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected server: Server;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly connectedClients = new Map<string, Set<string>>(); // clientId -> Set<roomNames>
  protected readonly clientMetadata = new Map<string, T>(); // clientId -> metadata

  /**
   * Handles new WebSocket connections
   * Override this method to add custom connection logic
   *
   * @param client - The connected socket client
   */
  async handleConnection(client: Socket): Promise<void> {
    const clientId = client.id;
    this.logger.log(`Client connected: ${clientId}`);

    try {
      // Initialize client's room tracking
      this.connectedClients.set(clientId, new Set());

      // Extract and store client metadata
      const metadata = await this.extractClientMetadata(client);
      this.clientMetadata.set(clientId, metadata);

      // Send connection confirmation
      await this.sendConnectionConfirmation(client, metadata);

      // Call custom connection logic
      await this.onClientConnected(client, metadata);

      this.logger.log(`Client ${clientId} connected successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to handle connection for client ${clientId}:`,
        error,
      );
      client.disconnect();
    }
  }

  /**
   * Handles WebSocket disconnections
   * Override this method to add custom disconnection logic
   *
   * @param client - The disconnected socket client
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);

    try {
      // Clean up client's room subscriptions
      await this.cleanupClientRooms(clientId);

      // Call custom disconnection logic
      await this.onClientDisconnected(client);

      // Clean up client data
      this.connectedClients.delete(clientId);
      this.clientMetadata.delete(clientId);

      this.logger.log(`Client ${clientId} disconnected successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to handle disconnection for client ${clientId}:`,
        error,
      );
    }
  }

  /**
   * Joins a client to a room and tracks the subscription
   *
   * @param clientId - The client ID
   * @param roomName - The room name to join
   * @param client - The socket client (optional, for immediate join)
   * @returns True if successful, false otherwise
   */
  async joinRoom(
    clientId: string,
    roomName: string,
    client?: Socket,
  ): Promise<boolean> {
    try {
      // Join the room if client is provided
      if (client) {
        await client.join(roomName);
      }

      // Track the room subscription
      const clientRooms = this.connectedClients.get(clientId) || new Set();
      clientRooms.add(roomName);
      this.connectedClients.set(clientId, clientRooms);

      this.logger.debug(`Client ${clientId} joined room: ${roomName}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to join client ${clientId} to room ${roomName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Removes a client from a room and updates tracking
   *
   * @param clientId - The client ID
   * @param roomName - The room name to leave
   * @param client - The socket client (optional, for immediate leave)
   * @returns True if successful, false otherwise
   */
  async leaveRoom(
    clientId: string,
    roomName: string,
    client?: Socket,
  ): Promise<boolean> {
    try {
      // Leave the room if client is provided
      if (client) {
        await client.leave(roomName);
      }

      // Update tracking
      const clientRooms = this.connectedClients.get(clientId);
      if (clientRooms) {
        clientRooms.delete(roomName);
        if (clientRooms.size === 0) {
          this.connectedClients.delete(clientId);
        }
      }

      this.logger.debug(`Client ${clientId} left room: ${roomName}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to leave client ${clientId} from room ${roomName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Broadcasts a message to all clients in a specific room
   *
   * @param roomName - The room name to broadcast to
   * @param event - The event name
   * @param data - The data to broadcast
   * @returns Number of clients that received the message
   */
  async broadcastToRoom<TData = any>(
    roomName: string,
    event: string,
    data: TData,
  ): Promise<number> {
    try {
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (!room) {
        this.logger.debug(`Room ${roomName} not found or empty`);
        return 0;
      }

      const clientCount = room.size;
      this.server.to(roomName).emit(event, data);

      this.logger.debug(
        `Broadcasted ${event} to ${clientCount} clients in room ${roomName}`,
      );
      return clientCount;
    } catch (error) {
      this.logger.error(`Failed to broadcast to room ${roomName}:`, error);
      return 0;
    }
  }

  /**
   * Sends a message to a specific client
   *
   * @param clientId - The client ID to send to
   * @param event - The event name
   * @param data - The data to send
   * @returns True if successful, false otherwise
   */
  async sendToClient<TData = any>(
    clientId: string,
    event: string,
    data: TData,
  ): Promise<boolean> {
    try {
      const client = this.server.sockets.sockets.get(clientId);
      if (!client) {
        this.logger.debug(`Client ${clientId} not found`);
        return false;
      }

      client.emit(event, data);
      this.logger.debug(`Sent ${event} to client ${clientId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Gets connection statistics
   *
   * @returns Object containing connection statistics
   */
  getConnectionStats(): {
    totalClients: number;
    totalRooms: number;
    clientRooms: Record<string, string[]>;
  } {
    const totalClients = this.connectedClients.size;
    const allRooms = new Set<string>();

    // Collect all unique rooms
    for (const rooms of this.connectedClients.values()) {
      for (const room of rooms) {
        allRooms.add(room);
      }
    }

    const totalRooms = allRooms.size;

    // Build client-room mapping
    const clientRooms: Record<string, string[]> = {};
    for (const [clientId, rooms] of this.connectedClients.entries()) {
      clientRooms[clientId] = Array.from(rooms);
    }

    return {
      totalClients,
      totalRooms,
      clientRooms,
    };
  }

  /**
   * Gets all clients in a specific room
   *
   * @param roomName - The room name
   * @returns Array of client IDs in the room
   */
  getClientsInRoom(roomName: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(roomName);
    if (!room) {
      return [];
    }
    return Array.from(room);
  }

  /**
   * Gets all rooms a client is subscribed to
   *
   * @param clientId - The client ID
   * @returns Array of room names
   */
  getClientRooms(clientId: string): string[] {
    const rooms = this.connectedClients.get(clientId);
    return rooms ? Array.from(rooms) : [];
  }

  /**
   * Checks if a client is connected
   *
   * @param clientId - The client ID to check
   * @returns True if connected, false otherwise
   */
  isClientConnected(clientId: string): boolean {
    return this.connectedClients.has(clientId);
  }

  /**
   * Checks if a client is in a specific room
   *
   * @param clientId - The client ID
   * @param roomName - The room name
   * @returns True if client is in the room, false otherwise
   */
  isClientInRoom(clientId: string, roomName: string): boolean {
    const clientRooms = this.connectedClients.get(clientId);
    return clientRooms ? clientRooms.has(roomName) : false;
  }

  // Abstract methods that child classes must implement

  /**
   * Extract client metadata from the connection
   * Override this method to extract user info, permissions, etc.
   *
   * @param client - The socket client
   * @returns Client metadata
   */
  protected abstract extractClientMetadata(client: Socket): Promise<T>;

  /**
   * Send connection confirmation to the client
   * Override this method to customize the connection message
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   */
  protected abstract sendConnectionConfirmation(
    client: Socket,
    metadata: T,
  ): Promise<void>;

  // Optional hooks that child classes can override

  /**
   * Called when a client successfully connects
   * Override this method to add custom connection logic
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   */
  protected async onClientConnected(
    client: Socket,
    metadata: T,
  ): Promise<void> {
    // Default implementation - do nothing
  }

  /**
   * Called when a client disconnects
   * Override this method to add custom disconnection logic
   *
   * @param client - The socket client
   */
  protected async onClientDisconnected(client: Socket): Promise<void> {
    // Default implementation - do nothing
  }

  // Private helper methods

  /**
   * Clean up client room subscriptions
   *
   * @param clientId - The client ID
   */
  private async cleanupClientRooms(clientId: string): Promise<void> {
    const clientRooms = this.connectedClients.get(clientId);
    if (clientRooms) {
      for (const roomName of clientRooms) {
        try {
          const client = this.server.sockets.sockets.get(clientId);
          if (client) {
            await client.leave(roomName);
          }
          this.logger.debug(`Client ${clientId} left room: ${roomName}`);
        } catch (error) {
          this.logger.warn(
            `Failed to leave room ${roomName} for client ${clientId}:`,
            error,
          );
        }
      }
    }
  }
}
