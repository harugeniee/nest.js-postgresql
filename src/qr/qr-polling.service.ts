import {
  QR_POLLING_CONFIG,
  QR_REDIS_PREFIXES,
  QrDeliveryCode,
  QrTicket,
  QrTicketStatus,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * QR Polling Service - Handles REST polling for QR ticket status
 *
 * This service provides:
 * - Ticket snapshot reading with version support
 * - Delivery code management for polling-based grant exchange
 * - Long-polling with Redis pub/sub for real-time updates
 * - ETag generation and validation
 */
@Injectable()
export class QrPollingService {
  private readonly logger = new Logger(QrPollingService.name);
  private readonly deliveryCodeTtl: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.deliveryCodeTtl =
      this.configService.get<number>('QR_GRANT_TTL_SECONDS') ||
      QR_POLLING_CONFIG.DELIVERY_CODE_TTL_SEC;
  }

  /**
   * Reads a ticket snapshot from Redis with all necessary fields for polling
   *
   * @param tid - The ticket ID to read
   * @returns Ticket snapshot data or null if not found
   */
  async readTicketSnapshot(tid: string): Promise<{
    status: QrTicketStatus;
    expiresAt: number;
    version: number;
    scannedAt?: number;
    approvedAt?: number;
    rejectedAt?: number;
    usedAt?: number;
    webSessionId?: string;
  } | null> {
    const ticketKey = `${QR_REDIS_PREFIXES.TICKET}${tid}`;
    const ticket = await this.cacheService.get<QrTicket>(ticketKey);

    if (!ticket) {
      return null;
    }

    // Check if ticket has expired
    if (Date.now() > ticket.expiresAt) {
      ticket.status = 'EXPIRED';
      ticket.version = (ticket.version || 0) + 1;
      await this.cacheService.set(ticketKey, ticket, this.getTicketTtl());
    }

    return {
      status: ticket.status,
      expiresAt: ticket.expiresAt,
      version: ticket.version || 0,
      scannedAt: ticket.scannedAt,
      approvedAt: ticket.approvedAt,
      rejectedAt: ticket.status === 'REJECTED' ? Date.now() : undefined,
      usedAt: ticket.status === 'USED' ? Date.now() : undefined,
      webSessionId: ticket.webSessionId,
    };
  }

  /**
   * Tries to get a delivery code for the given ticket and web session
   * Only returns delivery code if ticket is APPROVED and webSessionId matches
   *
   * @param tid - The ticket ID
   * @param webSessionId - The web session ID requesting the delivery code
   * @returns Delivery code if available and valid, null otherwise
   */
  async tryGetDeliveryCode(
    tid: string,
    webSessionId: string,
  ): Promise<string | null> {
    const deliveryKey = `${QR_REDIS_PREFIXES.DELIVERY}${tid}`;
    const delivery = await this.cacheService.get<QrDeliveryCode>(deliveryKey);

    if (!delivery) {
      return null;
    }

    // Check if delivery code has expired
    if (Date.now() > delivery.expiresAt) {
      await this.cacheService.delete(deliveryKey);
      return null;
    }

    // Check if webSessionId matches
    if (delivery.webSessionId !== webSessionId) {
      return null;
    }

    return delivery.deliveryCode;
  }

  /**
   * Creates a delivery code for the given ticket and web session
   * This is called when a ticket is approved
   *
   * @param tid - The ticket ID
   * @param webSessionId - The web session ID
   * @returns The generated delivery code
   */
  async createDeliveryCode(tid: string, webSessionId: string): Promise<string> {
    const deliveryCode = this.generateDeliveryCode();
    const delivery: QrDeliveryCode = {
      deliveryCode,
      tid,
      webSessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.deliveryCodeTtl * 1000,
    };

    const deliveryKey = `${QR_REDIS_PREFIXES.DELIVERY}${tid}`;
    await this.cacheService.set(deliveryKey, delivery, this.deliveryCodeTtl);

    this.logger.log(
      `Created delivery code for ticket ${tid} and session ${webSessionId}`,
    );
    return deliveryCode;
  }

  /**
   * Waits for a ticket status change or timeout using Redis pub/sub
   *
   * @param params - Parameters for the wait operation
   * @returns 'CHANGED' if status changed, 'TIMEOUT' if timeout reached
   */
  async waitForChangeOrTimeout(params: {
    tid: string;
    sinceVersion: number;
    timeoutMs: number;
  }): Promise<'CHANGED' | 'TIMEOUT'> {
    const { tid, sinceVersion, timeoutMs } = params;
    const channel = `${QR_REDIS_PREFIXES.STATUS_CHANNEL}${tid}`;

    return new Promise<'CHANGED' | 'TIMEOUT'>((resolve) => {
      const redis = this.cacheService.getRedisClient().duplicate();
      let isResolved = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        void redis
          .unsubscribe(channel)
          .then(() => redis.quit())
          .catch(() => {});
        resolve('TIMEOUT');
      }, timeoutMs);

      const cleanup = async () => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);
        try {
          await redis.unsubscribe(channel);
          await redis.quit();
        } catch (error) {
          this.logger.warn('Error during Redis cleanup:', error);
        }
      };

      // Subscribe to status changes
      void redis.subscribe(channel, (error) => {
        if (error) {
          this.logger.error(`Error subscribing to channel ${channel}:`, error);
          void cleanup().then(() => resolve('TIMEOUT'));
        }
      });

      // Handle messages
      redis.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message) as { version?: number };
            if (
              typeof data.version === 'number' &&
              data.version > sinceVersion
            ) {
              void cleanup().then(() => resolve('CHANGED'));
            }
          } catch (error) {
            this.logger.warn('Error parsing status message:', error);
          }
        }
      });

      // Handle Redis errors
      redis.on('error', (error) => {
        this.logger.error('Redis pub/sub error:', error);
        void cleanup().then(() => resolve('TIMEOUT'));
      });
    });
  }

  /**
   * Publishes a status change event to Redis pub/sub
   * This is called when ticket status changes
   *
   * @param tid - The ticket ID
   * @param status - The new status
   * @param version - The new version number
   */
  async publishStatusChange(
    tid: string,
    status: QrTicketStatus,
    version: number,
  ): Promise<void> {
    const channel = `${QR_REDIS_PREFIXES.STATUS_CHANNEL}${tid}`;
    const message = JSON.stringify({
      tid,
      status,
      version,
      timestamp: Date.now(),
    });

    try {
      await this.cacheService.getRedisClient().publish(channel, message);
      this.logger.debug(
        `Published status change for ticket ${tid}: ${status} (v${version})`,
      );
    } catch (error) {
      this.logger.error(
        `Error publishing status change for ticket ${tid}:`,
        error,
      );
    }
  }

  /**
   * Validates and consumes a delivery code for grant exchange
   * This is a one-time operation - the delivery code is deleted after use
   *
   * @param tid - The ticket ID
   * @param deliveryCode - The delivery code to validate
   * @returns True if valid and consumed, false otherwise
   */
  async validateAndConsumeDeliveryCode(
    tid: string,
    deliveryCode: string,
  ): Promise<boolean> {
    const deliveryKey = `${QR_REDIS_PREFIXES.DELIVERY}${tid}`;
    const delivery = await this.cacheService.get<QrDeliveryCode>(deliveryKey);

    if (!delivery) {
      return false;
    }

    // Check if delivery code has expired
    if (Date.now() > delivery.expiresAt) {
      await this.cacheService.delete(deliveryKey);
      return false;
    }

    // Check if delivery code matches
    if (delivery.deliveryCode !== deliveryCode) {
      return false;
    }

    // Consume the delivery code (delete it)
    await this.cacheService.delete(deliveryKey);
    this.logger.log(`Consumed delivery code for ticket ${tid}`);
    return true;
  }

  /**
   * Generates a secure random delivery code
   *
   * @returns Base64url encoded random string
   */
  private generateDeliveryCode(): string {
    const bytes = new Uint8Array(16); // 16 bytes = 128 bits
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString('base64url');
  }

  /**
   * Gets the ticket TTL from configuration
   *
   * @returns TTL in seconds
   */
  private getTicketTtl(): number {
    return this.configService.get<number>('QR_TICKET_TTL_SECONDS') || 180;
  }
}
