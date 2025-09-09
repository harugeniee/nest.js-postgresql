import { Injectable, Logger } from '@nestjs/common';
import { MailQueueIntegrationService } from 'src/shared/services/mail/mail-queue-integration.service';
import { EmailOtpSender } from '../interfaces';

/**
 * Email OTP sender implementation using queue-based email sending
 * Sends OTP codes via email using RabbitMQ queue for asynchronous processing
 */
@Injectable()
export class MailerEmailOtpSender implements EmailOtpSender {
  private readonly logger = new Logger(MailerEmailOtpSender.name);

  constructor(
    private readonly mailQueueIntegration: MailQueueIntegrationService,
  ) {}

  /**
   * Send OTP code via email using queue
   * @param email - Recipient email address
   * @param code - OTP code to send
   * @param requestId - Request ID for tracking
   * @returns Promise that resolves when email is queued
   */
  async sendOtp(email: string, code: string, requestId: string): Promise<void> {
    try {
      this.logger.log(
        `Queuing OTP email to: ${this.maskEmail(email)}, requestId: ${requestId}`,
      );

      const result = await this.mailQueueIntegration.sendOtpEmailQueue(
        email,
        code,
        requestId,
        {
          // Additional template data
          appName: process.env.APP_NAME || 'NestJS App',
          appUrl: process.env.APP_URL || 'http://localhost:3000',
          supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
          companyName: process.env.COMPANY_NAME || 'Your Company',
        },
        8, // High priority for OTP emails
      );

      this.logger.log(
        `OTP email queued successfully to: ${this.maskEmail(email)}, jobId: ${result.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error queuing OTP email to ${this.maskEmail(email)}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Mask email address for logging (security)
   * @param email - Email address to mask
   * @returns Masked email address
   */
  private maskEmail(email: string): string {
    if (!email?.includes('@')) {
      return '***@***';
    }

    const [localPart, domain] = email.split('@');
    const maskedLocal =
      localPart.length > 2
        ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`
        : '**';

    return `${maskedLocal}@${domain}`;
  }
}
