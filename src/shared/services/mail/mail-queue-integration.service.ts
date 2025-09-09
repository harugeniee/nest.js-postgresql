import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { MailOptions, MailAddress } from './mail.interface';
import { maskEmail } from 'src/common/utils';

/**
 * Mail Queue Integration Service
 * Provides a unified interface for both direct and queue-based email sending
 */
@Injectable()
export class MailQueueIntegrationService {
  private readonly logger = new Logger(MailQueueIntegrationService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  /**
   * Send single email via queue (asynchronous)
   */
  async sendMailQueue(
    mailOptions: MailOptions,
    priority: number = 5,
    delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const jobId = await this.mailQueueService.sendSingleEmail(
        mailOptions,
        priority,
        delay,
      );

      this.logger.log(`Single email queued successfully: ${jobId}`);
      return {
        jobId,
        message: 'Email queued for processing',
      };
    } catch (error) {
      this.logger.error('Failed to queue single email:', error);
      throw error;
    }
  }

  /**
   * Send batch email via queue (asynchronous)
   */
  async sendMailBatchQueue(
    mailOptions: Omit<MailOptions, 'to'>,
    recipients: MailAddress[],
    priority: number = 5,
    delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const jobId = await this.mailQueueService.sendBatchEmail(
        mailOptions,
        recipients,
        priority,
        delay,
      );

      this.logger.log(
        `Batch email queued successfully: ${jobId}, recipients: ${recipients.length}`,
      );
      return {
        jobId,
        message: `Batch email queued for ${recipients.length} recipients`,
      };
    } catch (error) {
      this.logger.error('Failed to queue batch email:', error);
      throw error;
    }
  }

  /**
   * Send template email via queue (asynchronous)
   */
  async sendTemplateMailQueue(
    templateName: string,
    recipients: MailAddress | MailAddress[],
    templateData: Record<string, unknown> = {},
    options: Partial<MailOptions> = {},
    priority: number = 5,
    delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const jobId = await this.mailQueueService.sendTemplateEmail(
        templateName,
        recipients,
        templateData,
        options,
        priority,
        delay,
      );

      this.logger.log(
        `Template email queued successfully: ${jobId}, template: ${templateName}`,
      );
      return {
        jobId,
        message: `Template email '${templateName}' queued for processing`,
      };
    } catch (error) {
      this.logger.error('Failed to queue template email:', error);
      throw error;
    }
  }

  /**
   * Send OTP email via queue (asynchronous)
   */
  async sendOtpEmailQueue(
    email: string,
    otpCode: string,
    requestId: string,
    templateData: Record<string, unknown> = {},
    priority: number = 8, // Higher priority for OTP emails
    delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const jobId = await this.mailQueueService.sendOtpEmail(
        email,
        otpCode,
        requestId,
        templateData,
        priority,
        delay,
      );

      this.logger.log(
        `OTP email queued successfully: ${jobId}, email: ${maskEmail(email)}`,
      );
      return {
        jobId,
        message: 'OTP email queued for processing',
      };
    } catch (error) {
      this.logger.error('Failed to queue OTP email:', error);
      throw error;
    }
  }

  /**
   * Send email directly (synchronous) - fallback method
   */
  async sendMailDirect(mailOptions: MailOptions) {
    return this.mailService.sendMail(mailOptions);
  }

  /**
   * Send batch email directly (synchronous) - fallback method
   */
  async sendMailBatchDirect(
    mailOptions: Omit<MailOptions, 'to'>,
    recipients: MailAddress[],
  ) {
    return this.mailService.sendMailBatch(mailOptions, recipients);
  }

  /**
   * Send template email directly (synchronous) - fallback method
   */
  async sendTemplateMailDirect(
    templateName: string,
    recipients: MailAddress | MailAddress[],
    templateData: Record<string, unknown> = {},
    options: Partial<MailOptions> = {},
  ) {
    return this.mailService.sendTemplateMail(
      templateName,
      recipients,
      templateData,
      options,
    );
  }

  /**
   * Send OTP email directly (synchronous) - fallback method
   */
  async sendOtpEmailDirect(
    email: string,
    otpCode: string,
    requestId: string,
    templateData: Record<string, unknown> = {},
  ) {
    return this.mailService.sendTemplateMail(
      'otp-login',
      { email },
      {
        otpCode,
        requestId,
        appName: process.env.APP_NAME || 'NestJS App',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
        companyName: process.env.COMPANY_NAME || 'Your Company',
        ...templateData,
      },
      {
        priority: 'high',
        headers: {
          'X-OTP-Request-ID': requestId,
          'X-OTP-Type': 'login',
        },
      },
    );
  }

  /**
   * Get mail service metrics
   */
  getMetrics() {
    return this.mailService.getMetrics();
  }

  /**
   * Test mail connection
   */
  async testConnection() {
    return this.mailService.testConnection();
  }
}
