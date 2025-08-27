import { Server, Socket } from 'socket.io';

import { Logger, ExecutionContext } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { WebSocketAuthGuard } from 'src/auth/guard';
import { AuthPayload } from 'src/common/interface';

// Extend Socket interface to include user property
interface AuthenticatedSocket extends Socket {
  user?: AuthPayload;
}

/**
 * Base WebSocket Gateway with JWT Authentication Support
 *
 * This abstract class provides common WebSocket functionality that can be
 * inherited by specific gateway implementations. It handles:
 * - JWT authentication and validation (using existing AuthGuard)
 * - Connection management with auth
 * - Client tracking with user context
 * - Room management
 * - Event broadcasting
 * - Error handling
 * - Logging
 *
 * @template T - Type for client metadata (e.g., user info, permissions)
 * @template U - Type for JWT payload (e.g., AuthPayload)
 */
@WebSocketGateway()
export abstract class BaseGateway<T = Record<string, any>, U = any>
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected server: Server;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly connectedClients = new Map<string, Set<string>>(); // clientId -> Set<roomNames>
  protected readonly clientMetadata = new Map<string, T>(); // clientId -> metadata
  protected readonly authenticatedClients = new Map<string, U>(); // clientId -> JWT payload

  /**
   * Optional: Override this to use custom authentication logic
   * If not overridden, will use the default AuthGuard-based authentication
   */
  protected useCustomAuthentication = false;

  /**
   * Handles new WebSocket connections with JWT authentication
   * Override this method to add custom connection logic
   *
   * @param client - The connected socket client
   */
  async handleConnection(client: Socket): Promise<void> {
    const clientId = client.id;
    this.logger.log(`Client connecting: ${clientId}`);

    try {
      let authPayload: U | null = null;

      // Choose authentication method
      if (this.useCustomAuthentication) {
        // Use custom authentication logic
        authPayload = await this.authenticateClient(client);
      } else {
        // Use existing AuthGuard logic
        authPayload = await this.authenticateWithGuard(client);
      }

      if (!authPayload) {
        this.logger.warn(`Authentication failed for client ${clientId}`);
        client.emit('auth:error', {
          message: 'Authentication failed',
          timestamp: Date.now(),
        });
        client.disconnect();
        return;
      }

      // Store authenticated client
      this.authenticatedClients.set(clientId, authPayload);

      // Initialize client's room tracking
      this.connectedClients.set(clientId, new Set());

      // Extract and store client metadata
      const metadata = await this.extractClientMetadata(client, authPayload);
      this.clientMetadata.set(clientId, metadata);

      // Send connection confirmation
      await this.sendConnectionConfirmation(client, metadata, authPayload);

      // Call custom connection logic
      await this.onClientConnected(client, metadata, authPayload);

      this.logger.log(
        `Client ${clientId} connected successfully as user ${this.getUserId(authPayload)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle connection for client ${clientId}:`,
        error,
      );

      // Send error to client before disconnecting
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      client.emit('auth:error', {
        message: errorMessage,
        timestamp: Date.now(),
      });

      client.disconnect();
    }
  }

  /**
   * Authenticates a client using the existing AuthGuard logic
   * This method reuses the same JWT verification logic as HTTP endpoints
   *
   * @param client - The socket client
   * @returns JWT payload if valid, null if invalid
   */
  protected async authenticateWithGuard(client: Socket): Promise<U | null> {
    try {
      const mockContext = this.createMockExecutionContext(client);
      const authGuard = this.createAuthGuard();

      const isAuthenticated = await authGuard.canActivate(mockContext);

      if (isAuthenticated) {
        return this.extractUserFromSocket(client);
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Guard-based authentication failed for client ${client.id}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Creates a mock execution context for the WebSocket guard
   *
   * @param client - The socket client
   * @returns Mock execution context
   */
  private createMockExecutionContext(client: Socket): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => client as any,
        getResponse: () => ({}) as any,
        getNext: () => (() => {}) as any,
      }),
      switchToRpc: () => ({
        getData: () => ({} as any),
        getContext: () => ({} as any),
      }),
      switchToWs: () => ({
        getClient: () => client as any,
        getData: () => ({} as any),
        getPattern: () => 'websocket' as any,
      }),
      getClass: () => ({}) as any,
      getHandler: () => ({}) as any,
      getType: () => 'ws' as any,
      getArgs: () => [] as any,
      getArgByIndex: () => undefined as any,
    };
  }

  /**
   * Creates a new instance of WebSocketAuthGuard
   *
   * @returns Configured auth guard instance
   */
  private createAuthGuard(): WebSocketAuthGuard {
    return new WebSocketAuthGuard(
      this.getJwtService(),
      this.getCacheService(),
      this.getConfigService(),
    );
  }

  /**
   * Extracts user information from the authenticated socket
   *
   * @param client - The socket client
   * @returns User payload or null
   */
  private extractUserFromSocket(client: Socket): U | null {
    // The WebSocketAuthGuard should have set the user property on the socket
    const authenticatedClient = client as AuthenticatedSocket;
    return (authenticatedClient.user as U) || null;
  }

  /**
   * Authenticates a client using custom JWT validation logic
   * Override this method to implement custom authentication
   * Only called when useCustomAuthentication = true
   *
   * @param client - The socket client
   * @returns JWT payload if valid, null if invalid
   */
  protected async authenticateClient(client: Socket): Promise<U | null> {
    // Default implementation - should be overridden if useCustomAuthentication = true
    throw new Error(
      'Custom authentication not implemented. Override authenticateClient() method.',
    );
  }

  /**
   * Extract client metadata from the connection
   * Override this method to extract user info, permissions, etc.
   *
   * @param client - The socket client
   * @param authPayload - The authenticated JWT payload
   * @returns Client metadata
   */
  protected abstract extractClientMetadata(
    client: Socket,
    authPayload: U,
  ): Promise<T>;

  /**
   * Send connection confirmation to the client
   * Override this method to customize the connection message
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   * @param authPayload - The authenticated JWT payload
   */
  protected abstract sendConnectionConfirmation(
    client: Socket,
    metadata: T,
    authPayload: U,
  ): Promise<void>;

  /**
   * Gets the user ID from the JWT payload
   * Override this method if your JWT payload structure is different
   *
   * @param authPayload - The JWT payload
   * @returns User ID string
   */
  protected getUserId(authPayload: U): string {
    // Default implementation - assume payload has 'uid' or 'userId' property
    const payload = authPayload as Record<string, any>;
    return payload?.uid || payload?.userId || 'unknown';
  }

  // Abstract methods for dependency injection (must be implemented by child classes)

  /**
   * Get JWT service instance
   * Override this method to provide JWT service
   */
  protected abstract getJwtService(): any;

  /**
   * Get cache service instance
   * Override this method to provide cache service
   */
  protected abstract getCacheService(): any;

  /**
   * Get config service instance
   * Override this method to provide config service
   */
  protected abstract getConfigService(): any;

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
      const authPayload = this.authenticatedClients.get(clientId);
      await this.onClientDisconnected(client, authPayload);

      // Clean up client data
      this.connectedClients.delete(clientId);
      this.clientMetadata.delete(clientId);
      this.authenticatedClients.delete(clientId);

      this.logger.log(`Client ${clientId} disconnected successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to handle disconnection for client ${clientId}:`,
        error,
      );
    }
  }

  /**
   * Checks if a client is authenticated
   *
   * @param clientId - The client ID to check
   * @returns True if authenticated, false otherwise
   */
  isClientAuthenticated(clientId: string): boolean {
    return this.authenticatedClients.has(clientId);
  }

  /**
   * Gets the JWT payload for a client
   *
   * @param clientId - The client ID
   * @returns JWT payload or undefined if not authenticated
   */
  getClientAuthPayload(clientId: string): U | undefined {
    return this.authenticatedClients.get(clientId);
  }

  /**
   * Gets all authenticated clients
   *
   * @returns Map of client ID to JWT payload
   */
  getAllAuthenticatedClients(): Map<string, U> {
    return new Map(this.authenticatedClients);
  }

  /**
   * Joins a client to a room and tracks the subscription
   * Only authenticated clients can join rooms
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
      // Check if client is authenticated
      if (!this.isClientAuthenticated(clientId)) {
        this.logger.warn(
          `Unauthenticated client ${clientId} attempted to join room ${roomName}`,
        );
        return false;
      }

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
   * Gets connection statistics including authentication info
   *
   * @returns Object containing connection statistics
   */
  getConnectionStats(): {
    totalClients: number;
    authenticatedClients: number;
    totalRooms: number;
    clientRooms: Record<string, string[]>;
    authenticatedClientRooms: Record<string, string[]>;
  } {
    const totalClients = this.connectedClients.size;
    const authenticatedClients = this.authenticatedClients.size;
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
    const authenticatedClientRooms: Record<string, string[]> = {};

    for (const [clientId, rooms] of this.connectedClients.entries()) {
      const roomArray = Array.from(rooms);
      clientRooms[clientId] = roomArray;

      // Separate authenticated clients
      if (this.isClientAuthenticated(clientId)) {
        authenticatedClientRooms[clientId] = roomArray;
      }
    }

    return {
      totalClients,
      authenticatedClients,
      totalRooms,
      clientRooms,
      authenticatedClientRooms,
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
   * Gets all authenticated clients in a specific room
   *
   * @param roomName - The room name
   * @returns Array of authenticated client IDs in the room
   */
  getAuthenticatedClientsInRoom(roomName: string): string[] {
    const allClients = this.getClientsInRoom(roomName);
    return allClients.filter((clientId) =>
      this.isClientAuthenticated(clientId),
    );
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

  // Optional hooks that child classes can override

  /**
   * Called when a client successfully connects
   * Override this method to add custom connection logic
   *
   * @param client - The socket client
   * @param metadata - The extracted client metadata
   * @param authPayload - The authenticated JWT payload
   */
  protected async onClientConnected(
    client: Socket,
    metadata: T,
    authPayload: U,
  ): Promise<void> {
    // Default implementation - do nothing
  }

  /**
   * Called when a client disconnects
   * Override this method to add custom disconnection logic
   *
   * @param client - The socket client
   * @param authPayload - The JWT payload (may be undefined if auth failed)
   */
  protected async onClientDisconnected(
    client: Socket,
    authPayload?: U,
  ): Promise<void> {
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
