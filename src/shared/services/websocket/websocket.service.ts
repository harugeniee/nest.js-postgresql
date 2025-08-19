import { Server, Socket } from 'socket.io';

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

// Interface for WebSocket message structure
export interface WebSocketMessage {
  event: string;
  data: unknown;
  room?: string;
  target?: string;
}

// Interface for WebSocket connection info
export interface ConnectionInfo {
  id: string;
  userId?: string;
  rooms: string[];
  connectedAt: Date;
  lastActivity: Date;
}

// Interface for room information
export interface RoomInfo {
  name: string;
  connections: string[];
  createdAt: Date;
  lastActivity: Date;
}

// Interface for broadcast options
export interface BroadcastOptions {
  room?: string;
  exclude?: string[];
  include?: string[];
  event?: string;
}

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private server!: Server;

  private readonly logger = new Logger(WebSocketService.name);
  private readonly connections = new Map<string, ConnectionInfo>();
  private readonly rooms = new Map<string, RoomInfo>();
  private readonly userConnections = new Map<string, string[]>(); // userId -> connectionIds

  onModuleInit(): void {
    this.logger.log('🚀 WebSocket service initialized');
  }

  /**
   * Set the WebSocket server instance
   * This method is called by the gateway controller
   * @param server - The WebSocket server instance
   */
  setServer(server: Server): void {
    if (!server || server === null || server === undefined) {
      this.logger.error('Server instance is required');
      return;
    }
    // @ts-expect-error - NestJS WebSocket gateway typing issue
    this.server = server!;
    this.setupWebSocketEventHandlers();
  }

  onModuleDestroy(): void {
    this.logger.log('🔄 WebSocket service shutting down');
    this.cleanupConnections();
  }

  /**
   * Check if server is ready
   */
  private isServerReady(): boolean {
    return this.server && typeof this.server.on === 'function';
  }

  /**
   * Setup WebSocket event handlers for connection management
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.isServerReady()) {
      this.logger.error('Server not initialized');
      return;
    }

    this.server.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this.server.on('disconnect', (socket: Socket) => {
      this.handleDisconnection(socket);
    });

    // Handle custom events
    this.server.on('join-room', (socket: Socket, roomName: string) => {
      this.handleJoinRoom(socket, roomName);
    });

    this.server.on('leave-room', (socket: Socket, roomName: string) => {
      this.handleLeaveRoom(socket, roomName);
    });

    this.server.on(
      'private-message',
      (socket: Socket, data: { target: string; message: unknown }) => {
        this.handlePrivateMessage(socket, data);
      },
    );
  }

  /**
   * Handle new WebSocket connection
   * @param socket - The connected socket
   */
  private handleConnection(socket: Socket): void {
    const connectionInfo: ConnectionInfo = {
      id: socket.id,
      rooms: [],
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(socket.id, connectionInfo);
    this.logger.log(`🔌 New WebSocket connection: ${socket.id}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to WebSocket server',
      connectionId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Setup socket event handlers
    this.setupSocketEventHandlers(socket);
  }

  /**
   * Handle WebSocket disconnection
   * @param socket - The disconnected socket
   */
  private handleDisconnection(socket: Socket): void {
    const connectionInfo = this.connections.get(socket.id);
    if (connectionInfo) {
      // Remove from all rooms
      connectionInfo.rooms.forEach((roomName) => {
        this.removeFromRoom(socket.id, roomName);
      });

      // Remove from user connections if authenticated
      if (connectionInfo.userId) {
        const userConnections =
          this.userConnections.get(connectionInfo.userId) || [];
        const updatedConnections = userConnections.filter(
          (id) => id !== socket.id,
        );
        if (updatedConnections.length > 0) {
          this.userConnections.set(connectionInfo.userId, updatedConnections);
        } else {
          this.userConnections.delete(connectionInfo.userId);
        }
      }

      this.connections.delete(socket.id);
      this.logger.log(`🔌 WebSocket disconnected: ${socket.id}`);
    }
  }

  /**
   * Setup individual socket event handlers
   * @param socket - The socket to setup handlers for
   */
  private setupSocketEventHandlers(socket: Socket): void {
    // Handle join room request
    socket.on(
      'join-room',
      (roomName: string, callback?: (success: boolean) => void) => {
        const success = this.handleJoinRoom(socket, roomName);
        if (callback) {
          callback(success);
        }
      },
    );

    // Handle leave room request
    socket.on(
      'leave-room',
      (roomName: string, callback?: (success: boolean) => void) => {
        const success = this.handleLeaveRoom(socket, roomName);
        if (callback) {
          callback(success);
        }
      },
    );

    // Handle private message
    socket.on(
      'private-message',
      (data: { target: string; message: unknown }) => {
        this.handlePrivateMessage(socket, data);
      },
    );

    // Handle authentication
    socket.on(
      'authenticate',
      (userId: string, callback?: (success: boolean) => void) => {
        const success = this.authenticateUser(socket.id, userId);
        if (callback) {
          callback(success);
        }
      },
    );

    // Handle ping for keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
      this.updateLastActivity(socket.id);
    });

    // Handle custom events
    socket.on('custom-event', (data: WebSocketMessage) => {
      this.handleCustomEvent(socket, data);
    });
  }

  /**
   * Handle join room request
   * @param socket - The socket requesting to join
   * @param roomName - Name of the room to join
   * @returns true if successfully joined, false otherwise
   */
  private handleJoinRoom(socket: Socket, roomName: string): boolean {
    try {
      if (!roomName || typeof roomName !== 'string') {
        this.logger.warn(`Invalid room name: ${roomName}`);
        return false;
      }

      // Join the room
      socket.join(roomName);

      // Update connection info
      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo && !connectionInfo.rooms.includes(roomName)) {
        connectionInfo.rooms.push(roomName);
        this.updateLastActivity(socket.id);
      }

      // Update room info
      let roomInfo = this.rooms.get(roomName);
      if (!roomInfo) {
        roomInfo = {
          name: roomName,
          connections: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        };
        this.rooms.set(roomName, roomInfo);
      }

      if (!roomInfo.connections.includes(socket.id)) {
        roomInfo.connections.push(socket.id);
        roomInfo.lastActivity = new Date();
      }

      this.logger.log(`👥 Socket ${socket.id} joined room: ${roomName}`);

      // Notify room members
      socket.to(roomName).emit('user-joined', {
        socketId: socket.id,
        room: roomName,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to join room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Handle leave room request
   * @param socket - The socket requesting to leave
   * @param roomName - Name of the room to leave
   * @returns true if successfully left, false otherwise
   */
  private handleLeaveRoom(socket: Socket, roomName: string): boolean {
    try {
      if (!roomName || typeof roomName !== 'string') {
        this.logger.warn(`Invalid room name: ${roomName}`);
        return false;
      }

      // Leave the room
      socket.leave(roomName);

      // Update connection info
      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms = connectionInfo.rooms.filter(
          (room) => room !== roomName,
        );
        this.updateLastActivity(socket.id);
      }

      // Update room info
      const roomInfo = this.rooms.get(roomName);
      if (roomInfo) {
        roomInfo.connections = roomInfo.connections.filter(
          (id) => id !== socket.id,
        );
        roomInfo.lastActivity = new Date();

        // Remove empty rooms
        if (roomInfo.connections.length === 0) {
          this.rooms.delete(roomName);
        }
      }

      this.logger.log(`👋 Socket ${socket.id} left room: ${roomName}`);

      // Notify room members
      socket.to(roomName).emit('user-left', {
        socketId: socket.id,
        room: roomName,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to leave room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Handle private message between users
   * @param socket - The sending socket
   * @param data - Message data containing target and message
   */
  private handlePrivateMessage(
    socket: Socket,
    data: { target: string; message: unknown },
  ): void {
    try {
      const { target, message } = data;

      if (!target || !message) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Find target user's connections
      const targetConnections = this.userConnections.get(target);
      if (!targetConnections || targetConnections.length === 0) {
        socket.emit('error', { message: 'Target user not found or offline' });
        return;
      }

      // Send message to all target user's connections
      const messageData = {
        from: this.getUserIdBySocketId(socket.id),
        message,
        timestamp: new Date().toISOString(),
      };

      targetConnections.forEach((connectionId) => {
        this.server.to(connectionId).emit('private-message', messageData);
      });

      // Send confirmation to sender
      socket.emit('message-sent', {
        target,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `💬 Private message sent from ${socket.id} to user ${target}`,
      );
    } catch (error) {
      this.logger.error('Failed to send private message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle custom events
   * @param socket - The socket that sent the event
   * @param data - Event data
   */
  private handleCustomEvent(socket: Socket, data: WebSocketMessage): void {
    try {
      const { event, data: eventData, room } = data;

      if (!event) {
        socket.emit('error', { message: 'Event name is required' });
        return;
      }

      if (room) {
        // Broadcast to specific room
        this.broadcastToRoom(room, event, eventData, { exclude: [socket.id] });
      } else {
        // Broadcast to all connected clients
        this.broadcastToAll(event, eventData, { exclude: [socket.id] });
      }

      this.logger.log(
        `📡 Custom event '${event}' handled by socket ${socket.id}`,
      );
    } catch (error) {
      this.logger.error('Failed to handle custom event:', error);
      socket.emit('error', { message: 'Failed to handle event' });
    }
  }

  /**
   * Authenticate a user with their socket connection
   * @param socketId - The socket ID to authenticate
   * @param userId - The user ID to associate with the socket
   * @returns true if successfully authenticated, false otherwise
   */
  private authenticateUser(socketId: string, userId: string): boolean {
    try {
      if (!userId || typeof userId !== 'string') {
        this.logger.warn(`Invalid user ID: ${userId}`);
        return false;
      }

      const connectionInfo = this.connections.get(socketId);
      if (!connectionInfo) {
        this.logger.warn(`Connection not found: ${socketId}`);
        return false;
      }

      // Update connection info
      connectionInfo.userId = userId;
      this.updateLastActivity(socketId);

      // Update user connections mapping
      const existingConnections = this.userConnections.get(userId) || [];
      if (!existingConnections.includes(socketId)) {
        existingConnections.push(socketId);
        this.userConnections.set(userId, existingConnections);
      }

      this.logger.log(`🔐 Socket ${socketId} authenticated as user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to authenticate socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Update last activity timestamp for a connection
   * @param socketId - The socket ID to update
   */
  private updateLastActivity(socketId: string): void {
    const connectionInfo = this.connections.get(socketId);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
    }
  }

  /**
   * Get user ID by socket ID
   * @param socketId - The socket ID to look up
   * @returns The user ID if found, undefined otherwise
   */
  private getUserIdBySocketId(socketId: string): string | undefined {
    const connectionInfo = this.connections.get(socketId);
    return connectionInfo?.userId;
  }

  /**
   * Remove socket from a room
   * @param socketId - The socket ID to remove
   * @param roomName - The room name to remove from
   */
  private removeFromRoom(socketId: string, roomName: string): void {
    const roomInfo = this.rooms.get(roomName);
    if (roomInfo) {
      roomInfo.connections = roomInfo.connections.filter(
        (id) => id !== socketId,
      );
      roomInfo.lastActivity = new Date();

      if (roomInfo.connections.length === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  /**
   * Cleanup all connections on service shutdown
   */
  private cleanupConnections(): void {
    this.connections.clear();
    this.rooms.clear();
    this.userConnections.clear();
    this.logger.log('🧹 All WebSocket connections cleaned up');
  }

  // Public API methods

  /**
   * Broadcast message to all connected clients
   * @param event - Event name to emit
   * @param data - Data to send
   * @param options - Broadcast options
   */
  public broadcastToAll(
    event: string,
    data: unknown,
    options: BroadcastOptions = {},
  ): void {
    try {
      const { exclude = [], include = [] } = options;

      if (include.length > 0) {
        // Send only to specific connections
        include.forEach((connectionId) => {
          this.server.to(connectionId).emit(event, data);
        });
      } else {
        // Send to all except excluded
        this.server.emit(event, data);

        // Remove from excluded connections if they received the message
        exclude.forEach((connectionId) => {
          this.server.to(connectionId).emit(event, data);
        });
      }

      this.logger.log(`📡 Broadcasted event '${event}' to all clients`);
    } catch (error) {
      this.logger.error(`Failed to broadcast event '${event}':`, error);
    }
  }

  /**
   * Broadcast message to a specific room
   * @param roomName - Room name to broadcast to
   * @param event - Event name to emit
   * @param data - Data to send
   * @param options - Broadcast options
   */
  public broadcastToRoom(
    roomName: string,
    event: string,
    data: unknown,
    options: BroadcastOptions = {},
  ): void {
    try {
      const { exclude = [] } = options;

      if (exclude.length > 0) {
        // Send to room except excluded connections
        this.server.to(roomName).except(exclude).emit(event, data);
      } else {
        // Send to entire room
        this.server.to(roomName).emit(event, data);
      }

      this.logger.log(`📡 Broadcasted event '${event}' to room '${roomName}'`);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast event '${event}' to room '${roomName}':`,
        error,
      );
    }
  }

  /**
   * Send message to specific user
   * @param userId - User ID to send message to
   * @param event - Event name to emit
   * @param data - Data to send
   * @returns true if message was sent, false otherwise
   */
  public sendToUser(userId: string, event: string, data: unknown): boolean {
    try {
      const userConnections = this.userConnections.get(userId);
      if (!userConnections || userConnections.length === 0) {
        this.logger.warn(`User ${userId} has no active connections`);
        return false;
      }

      userConnections.forEach((connectionId) => {
        this.server.to(connectionId).emit(event, data);
      });

      this.logger.log(`📤 Sent event '${event}' to user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send event '${event}' to user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send message to specific socket
   * @param socketId - Socket ID to send message to
   * @param event - Event name to emit
   * @param data - Data to send
   * @returns true if message was sent, false otherwise
   */
  public sendToSocket(socketId: string, event: string, data: unknown): boolean {
    try {
      this.server.to(socketId).emit(event, data);
      this.logger.log(`📤 Sent event '${event}' to socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send event '${event}' to socket ${socketId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get all active connections
   * @returns Array of connection information
   */
  public getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all active rooms
   * @returns Array of room information
   */
  public getActiveRooms(): RoomInfo[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get connection count
   * @returns Total number of active connections
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get room count
   * @returns Total number of active rooms
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get user's active connections
   * @param userId - User ID to get connections for
   * @returns Array of connection IDs
   */
  public getUserConnections(userId: string): string[] {
    return this.userConnections.get(userId) || [];
  }

  /**
   * Check if user is online
   * @param userId - User ID to check
   * @returns true if user has active connections, false otherwise
   */
  public isUserOnline(userId: string): boolean {
    const connections = this.userConnections.get(userId);
    return connections ? connections.length > 0 : false;
  }

  /**
   * Get WebSocket server instance
   * @returns Socket.IO server instance
   */
  public getServer(): Server {
    return this.server;
  }
}
