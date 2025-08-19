import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
    external: number;
  };
  services: {
    database: HealthStatus;
    redis: HealthStatus;
    rabbitmq?: HealthStatus;
  };
}

interface HealthStatus {
  status: 'ok' | 'error';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const [databaseStatus, redisStatus] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
      ]);

      const memoryUsage = process.memoryUsage();

      return {
        status: this.getOverallStatus([databaseStatus, redisStatus]),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          free: Math.round(
            (memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024,
          ),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        services: {
          database: databaseStatus,
          redis: redisStatus,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: 0,
          total: 0,
          free: 0,
          external: 0,
        },
        services: {
          database: { status: 'error', error: 'Health check failed' },
          redis: { status: 'error', error: 'Health check failed' },
        },
      };
    }
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      if (!this.dataSource.isInitialized) {
        return { status: 'error', error: 'Database not initialized' };
      }

      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      await this.redis.ping();

      return {
        status: 'ok',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getOverallStatus(serviceStatuses: HealthStatus[]): 'ok' | 'error' {
    return serviceStatuses.every((status) => status.status === 'ok')
      ? 'ok'
      : 'error';
  }
}
