import { Injectable, Logger } from '@nestjs/common';
import { MailService } from 'src/shared/services/mail/mail.service';
import { EmailOtpSender } from '../interfaces';

/**
 * Email OTP sender implementation using the existing MailService
 * Sends OTP codes via email using configured mail templates
 */
@Injectable()
export class MailerEmailOtpSender implements EmailOtpSender {
  private readonly logger = new Logger(MailerEmailOtpSender.name);

  constructor(private readonly mailService: MailService) {}

  /**
   * Send OTP code via email
   * @param email - Recipient email address
   * @param code - OTP code to send
   * @param requestId - Request ID for tracking
   * @returns Promise that resolves when email is sent
   */
  async sendOtp(email: string, code: string, requestId: string): Promise<void> {
    try {
      this.logger.log(
        `Sending OTP email to: ${this.maskEmail(email)}, requestId: ${requestId}`,
      );

      const result = await this.mailService.sendTemplateMail(
        'otp-login', // Template name
        { email },
        {
          otpCode: code,
          requestId,
          // Additional template data
          appName: process.env.APP_NAME || 'NestJS App',
          appUrl: process.env.APP_URL || 'http://localhost:3000',
          supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
          companyName: process.env.COMPANY_NAME || 'Your Company',
        },
        {
          // Email options
          priority: 'high',
          headers: {
            'X-OTP-Request-ID': requestId,
            'X-OTP-Type': 'login',
          },
        },
      );

      if (!result.success) {
        this.logger.error(
          `Failed to send OTP email to ${this.maskEmail(email)}: ${result.error}`,
        );
        throw new Error(`Failed to send OTP email: ${result.error}`);
      }

      this.logger.log(
        `OTP email sent successfully to: ${this.maskEmail(email)}, messageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending OTP email to ${this.maskEmail(email)}:`,
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
