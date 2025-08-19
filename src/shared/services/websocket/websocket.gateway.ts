import { UseGuards, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { WebSocketService } from './websocket.service';

// Interface for authentication payload
export interface AuthPayload {
  userId: string;
  token?: string;
}

// Interface for room join payload
export interface RoomJoinPayload {
  roomName: string;
}

// Interface for room leave payload
export interface RoomLeavePayload {
  roomName: string;
}

// Interface for private message payload
export interface PrivateMessagePayload {
  targetUserId: string;
  message: string;
  messageType?: 'text' | 'image' | 'file' | 'notification';
}

// Interface for custom event payload
export interface CustomEventPayload {
  event: string;
  data: unknown;
  room?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class WebSocketGatewayController implements OnModuleInit {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly webSocketService: WebSocketService) {}

  onModuleInit(): void {
    // Set the server instance in the WebSocket service
    this.webSocketService.setServer(this.server);
  }

  /**
   * Handle user authentication
   * @param payload - Authentication payload containing userId and optional token
   * @param client - The connected socket client
   */
  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @MessageBody() payload: AuthPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { userId } = payload;

      if (!userId) {
        return { success: false, message: 'User ID is required' };
      }

      // Here you can add additional authentication logic
      // For example, verify JWT token, check user permissions, etc.

      // Authenticate the user with the WebSocket service
      const success = this.webSocketService['authenticateUser'](
        client.id,
        userId,
      );

      if (success) {
        // Send confirmation to the client
        client.emit('authenticated', {
          success: true,
          userId,
          message: 'Successfully authenticated',
          timestamp: new Date().toISOString(),
        });

        // Notify other clients about new user online
        this.webSocketService.broadcastToAll(
          'user-online',
          {
            userId,
            timestamp: new Date().toISOString(),
          },
          { exclude: [client.id] },
        );

        return { success: true, message: 'Successfully authenticated' };
      } else {
        return { success: false, message: 'Authentication failed' };
      }
    } catch (error) {
      return { success: false, message: 'Authentication error occurred' };
    }
  }

  /**
   * Handle joining a room
   * @param payload - Room join payload containing room name
   * @param client - The connected socket client
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() payload: RoomJoinPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { roomName } = payload;

      if (!roomName) {
        return { success: false, message: 'Room name is required' };
      }

      // Join the room using the WebSocket service
      const success = this.webSocketService['handleJoinRoom'](client, roomName);

      if (success) {
        // Send confirmation to the client
        client.emit('room-joined', {
          success: true,
          roomName,
          message: `Successfully joined room: ${roomName}`,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: `Successfully joined room: ${roomName}`,
        };
      } else {
        return { success: false, message: `Failed to join room: ${roomName}` };
      }
    } catch (error) {
      return { success: false, message: 'Error occurred while joining room' };
    }
  }

  /**
   * Handle leaving a room
   * @param payload - Room leave payload containing room name
   * @param client - The connected socket client
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() payload: RoomLeavePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { roomName } = payload;

      if (!roomName) {
        return { success: false, message: 'Room name is required' };
      }

      // Leave the room using the WebSocket service
      const success = this.webSocketService['handleLeaveRoom'](
        client,
        roomName,
      );

      if (success) {
        // Send confirmation to the client
        client.emit('room-left', {
          success: true,
          roomName,
          message: `Successfully left room: ${roomName}`,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: `Successfully left room: ${roomName}`,
        };
      } else {
        return { success: false, message: `Failed to leave room: ${roomName}` };
      }
    } catch (error) {
      return { success: false, message: 'Error occurred while leaving room' };
    }
  }

  /**
   * Handle private messages between users
   * @param payload - Private message payload containing target user and message
   * @param client - The connected socket client
   */
  @SubscribeMessage('private-message')
  async handlePrivateMessage(
    @MessageBody() payload: PrivateMessagePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { targetUserId, message, messageType = 'text' } = payload;

      if (!targetUserId || !message) {
        return {
          success: false,
          message: 'Target user ID and message are required',
        };
      }

      // Send private message using the WebSocket service
      this.webSocketService['handlePrivateMessage'](client, {
        target: targetUserId,
        message: {
          content: message,
          type: messageType,
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      return {
        success: false,
        message: 'Error occurred while sending message',
      };
    }
  }

  /**
   * Handle custom events
   * @param payload - Custom event payload containing event name, data, and optional room
   * @param client - The connected socket client
   */
  @SubscribeMessage('custom-event')
  async handleCustomEvent(
    @MessageBody() payload: CustomEventPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { event, data, room } = payload;

      if (!event) {
        return { success: false, message: 'Event name is required' };
      }

      // Handle custom event using the WebSocket service
      this.webSocketService['handleCustomEvent'](client, {
        event,
        data,
        room,
      });

      return { success: true, message: 'Custom event handled successfully' };
    } catch (error) {
      return {
        success: false,
        message: 'Error occurred while handling custom event',
      };
    }
  }

  /**
   * Handle ping for keep-alive
   * @param client - The connected socket client
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    // Send pong response
    client.emit('pong', {
      timestamp: Date.now(),
      message: 'Pong response',
    });
  }

  /**
   * Handle disconnect event
   * @param client - The disconnected socket client
   */
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    // The WebSocket service will handle the disconnection logic
    // This method can be used for additional cleanup if needed
  }

  /**
   * Get WebSocket server instance
   * @returns Socket.IO server instance
   */
  getServer(): Server {
    return this.server;
  }
}
