import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { RealTimeAnalyticsService } from '../services/real-time-analytics.service';
import { RealTimeAnalyticsQueryDto } from '../dto/dashboard-widget.dto';

/**
 * Analytics Real-time Gateway
 *
 * WebSocket gateway for real-time analytics streaming
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/analytics',
})
export class AnalyticsRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly realTimeAnalyticsService: RealTimeAnalyticsService,
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    console.log(`Analytics client connected: ${client.id}`);

    // Send initial connection confirmation
    client.emit('analytics.connected', {
      clientId: client.id,
      timestamp: new Date(),
      message: 'Connected to analytics real-time stream',
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    console.log(`Analytics client disconnected: ${client.id}`);

    // Stop real-time streaming for this client
    this.realTimeAnalyticsService.stopRealTimeStreaming(client.id);
  }

  /**
   * Subscribe to real-time analytics stream
   */
  @SubscribeMessage('analytics.subscribe')
  async handleSubscribe(
    @MessageBody() data: { query: RealTimeAnalyticsQueryDto },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { query } = data;

      // Start real-time streaming for this client
      this.realTimeAnalyticsService.startRealTimeStreaming(client.id, query);

      // Send initial data
      const initialData =
        await this.realTimeAnalyticsService.getRealTimeAnalytics(query);
      client.emit('analytics.data', initialData);

      // Confirm subscription
      client.emit('analytics.subscribed', {
        clientId: client.id,
        query,
        timestamp: new Date(),
        message: 'Successfully subscribed to analytics stream',
      });
    } catch (error) {
      console.error('Error subscribing to analytics:', error);
      client.emit('analytics.error', {
        error: 'Failed to subscribe to analytics stream',
        details: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Unsubscribe from real-time analytics stream
   */
  @SubscribeMessage('analytics.unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() client: Socket) {
    try {
      // Stop real-time streaming for this client
      this.realTimeAnalyticsService.stopRealTimeStreaming(client.id);

      // Confirm unsubscription
      client.emit('analytics.unsubscribed', {
        clientId: client.id,
        timestamp: new Date(),
        message: 'Successfully unsubscribed from analytics stream',
      });
    } catch (error) {
      console.error('Error unsubscribing from analytics:', error);
      client.emit('analytics.error', {
        error: 'Failed to unsubscribe from analytics stream',
        details: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Request specific analytics data
   */
  @SubscribeMessage('analytics.request')
  async handleRequest(
    @MessageBody() data: { query: RealTimeAnalyticsQueryDto },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { query } = data;

      // Get analytics data
      const analyticsData =
        await this.realTimeAnalyticsService.getRealTimeAnalytics(query);

      // Send data to client
      client.emit('analytics.data', analyticsData);
    } catch (error) {
      console.error('Error requesting analytics data:', error);
      client.emit('analytics.error', {
        error: 'Failed to get analytics data',
        details: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get connection statistics
   */
  @SubscribeMessage('analytics.stats')
  async handleStats(@ConnectedSocket() client: Socket) {
    try {
      const stats = this.realTimeAnalyticsService.getConnectionStats();

      client.emit('analytics.stats', {
        ...stats,
        clientId: client.id,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error getting analytics stats:', error);
      client.emit('analytics.error', {
        error: 'Failed to get analytics statistics',
        details: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast analytics data to all connected clients
   */
  async broadcastAnalyticsData(data: any) {
    this.server.emit('analytics.broadcast', {
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast live event to all connected clients
   */
  async broadcastLiveEvent(event: any) {
    this.server.emit('analytics.liveEvent', {
      event,
      timestamp: new Date(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Get connected clients info
   */
  getConnectedClientsInfo() {
    const clients = Array.from(this.server.sockets.sockets.values()).map(
      (socket) => ({
        id: socket.id,
        connectedAt: new Date(),
        rooms: Array.from(socket.rooms),
      }),
    );

    return {
      count: clients.length,
      clients,
      timestamp: new Date(),
    };
  }
}
