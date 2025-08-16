import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { JOB_NAME } from 'src/shared/constants';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(@Inject('WORKER_SERVICE') private readonly client: ClientProxy) {}

  onModuleInit(): void {
    // Start sending test messages every 3 seconds in development mode
    if (process.env.NODE_ENV === 'development') {
      // this.startTestMessageLoop();
    }
  }

  /**
   * Start test message loop for development environment
   */
  private startTestMessageLoop(): void {
    setInterval(() => {
      this.testRmq();
    }, 3000);
  }

  /**
   * Send test message to RabbitMQ (development only)
   */
  testRmq(): boolean {
    try {
      const data = {
        test: `${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug('Sending test message to RabbitMQ:', data);
      this.client.emit(JOB_NAME.TEST_RABBIT, JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error('Failed to send test message to RabbitMQ:', error);
      return false;
    }
  }

  /**
   * Send data to RabbitMQ with proper error handling
   * @param jobName - Name of the job/queue
   * @param data - Data to send
   * @returns true if successful, false otherwise
   */
  sendDataToRabbitMQ(jobName: string, data: unknown): boolean {
    try {
      this.logger.debug(`Sending data to RabbitMQ job: ${jobName}`, { data });
      this.client.emit(jobName, JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send data to RabbitMQ job: ${jobName}`,
        error,
      );
      return false;
    }
  }

  /**
   * Send data to RabbitMQ and wait for acknowledgment
   * @param jobName - Name of the job/queue
   * @param data - Data to send
   * @returns Promise that resolves when message is sent
   */
  async sendDataToRabbitMQAsync(
    jobName: string,
    data: unknown,
  ): Promise<boolean> {
    try {
      this.logger.debug(`Sending data to RabbitMQ job: ${jobName}`, { data });
      await this.client.emit(jobName, JSON.stringify(data)).toPromise();
      this.logger.debug(`Successfully sent data to RabbitMQ job: ${jobName}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send data to RabbitMQ job: ${jobName}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get RabbitMQ client instance
   */
  getClient(): ClientProxy {
    return this.client;
  }
}
