import { ServerOptions, Server } from 'socket.io';

import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;
  private isConnected = false;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(): Promise<void> {
    try {
      this.logger.log('🔌 Connecting to Redis...');

      // Create Redis clients with proper error handling
      this.pubClient = new Redis(process.env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.subClient = this.pubClient.duplicate();

      // Wait for both clients to connect
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      // Create the Redis adapter
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);

      this.isConnected = true;
      this.logger.log('✅ Redis adapter created successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    // Apply the Redis adapter if it's available and connected
    if (this.adapterConstructor && this.isConnected) {
      try {
        server.adapter(this.adapterConstructor);
        this.logger.log('✅ Redis adapter applied to Socket.IO server');
      } catch (error) {
        this.logger.error('❌ Failed to apply Redis adapter:', error);
        this.logger.warn('⚠️ Falling back to default adapter');
      }
    } else {
      this.logger.warn('⚠️ Redis adapter not available, using default adapter');
    }

    return server;
  }

  // Cleanup method to close Redis connections
  async close(): Promise<void> {
    try {
      if (this.pubClient && this.isConnected) {
        await this.pubClient.quit();
      }
      if (this.subClient && this.isConnected) {
        await this.subClient.quit();
      }
      this.isConnected = false;
      this.logger.log('✅ Redis connections closed');
    } catch (error) {
      this.logger.error('❌ Error closing Redis connections:', error);
    }
  }
}
