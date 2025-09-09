import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { JOB_NAME } from 'src/shared/constants';
import { maskEmail } from 'src/common/utils';
import {
  MailQueueJob,
  MailQueueJobType,
  SingleEmailQueueJob,
  BatchEmailQueueJob,
  TemplateEmailQueueJob,
  OtpEmailQueueJob,
  MailQueueConfig,
} from './mail-queue.interface';
import { MailOptions, MailAddress } from './mail.interface';

/**
 * Mail Queue Service
 * Handles sending mail jobs to RabbitMQ for asynchronous processing
 */
@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly config: MailQueueConfig = {
    defaultPriority: 5,
    defaultMaxAttempts: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 10,
    processingTimeout: 30000, // 30 seconds
  };

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `mail_${timestamp}_${random}`;
  }

  /**
   * Send single email job to queue
   */
  async sendSingleEmail(
    mailOptions: MailOptions,
    priority: number = this.config.defaultPriority,
    delay?: number,
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: SingleEmailQueueJob = {
      jobId,
      type: MailQueueJobType.SINGLE_EMAIL,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
      delay,
      mailOptions,
    };

    this.logger.debug(`Sending single email job: ${jobId}`);
    const success = this.rabbitMQService.sendDataToRabbitMQ(
      JOB_NAME.MAIL_SINGLE,
      job,
    );

    if (!success) {
      throw new Error(`Failed to send single email job: ${jobId}`);
    }

    return jobId;
  }

  /**
   * Send batch email job to queue
   */
  async sendBatchEmail(
    mailOptions: Omit<MailOptions, 'to'>,
    recipients: MailAddress[],
    priority: number = this.config.defaultPriority,
    delay?: number,
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: BatchEmailQueueJob = {
      jobId,
      type: MailQueueJobType.BATCH_EMAIL,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
      delay,
      mailOptions,
      recipients,
    };

    this.logger.debug(
      `Sending batch email job: ${jobId}, recipients: ${recipients.length}`,
    );
    const success = this.rabbitMQService.sendDataToRabbitMQ(
      JOB_NAME.MAIL_BATCH,
      job,
    );

    if (!success) {
      throw new Error(`Failed to send batch email job: ${jobId}`);
    }

    return jobId;
  }

  /**
   * Send template email job to queue
   */
  async sendTemplateEmail(
    templateName: string,
    recipients: MailAddress | MailAddress[],
    templateData: Record<string, unknown> = {},
    options: Partial<MailOptions> = {},
    priority: number = this.config.defaultPriority,
    delay?: number,
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: TemplateEmailQueueJob = {
      jobId,
      type: MailQueueJobType.TEMPLATE_EMAIL,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
      delay,
      templateName,
      recipients,
      templateData,
      options,
    };

    this.logger.debug(
      `Sending template email job: ${jobId}, template: ${templateName}`,
    );
    const success = this.rabbitMQService.sendDataToRabbitMQ(
      JOB_NAME.MAIL_TEMPLATE,
      job,
    );

    if (!success) {
      throw new Error(`Failed to send template email job: ${jobId}`);
    }

    return jobId;
  }

  /**
   * Send OTP email job to queue
   */
  async sendOtpEmail(
    email: string,
    otpCode: string,
    requestId: string,
    templateData: Record<string, unknown> = {},
    priority: number = this.config.defaultPriority,
    delay?: number,
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: OtpEmailQueueJob = {
      jobId,
      type: MailQueueJobType.OTP_EMAIL,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
      delay,
      email,
      otpCode,
      requestId,
      templateData,
    };

    this.logger.debug(
      `Sending OTP email job: ${jobId}, email: ${maskEmail(email)}`,
    );
    const success = this.rabbitMQService.sendDataToRabbitMQ(
      JOB_NAME.MAIL_OTP,
      job,
    );

    if (!success) {
      throw new Error(`Failed to send OTP email job: ${jobId}`);
    }

    return jobId;
  }

  /**
   * Send multiple jobs to queue with batching
   */
  async sendMultipleJobs(
    jobs: MailQueueJob[],
    batchSize: number = this.config.batchSize,
  ): Promise<string[]> {
    const jobIds: string[] = [];
    const batches = this.chunkArray(jobs, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (job) => {
        try {
          let jobId: string;
          switch (job.type) {
            case MailQueueJobType.SINGLE_EMAIL:
              jobId = await this.sendSingleEmail(
                job.mailOptions,
                job.priority,
                job.delay,
              );
              break;
            case MailQueueJobType.BATCH_EMAIL:
              jobId = await this.sendBatchEmail(
                job.mailOptions,
                job.recipients,
                job.priority,
                job.delay,
              );
              break;
            case MailQueueJobType.TEMPLATE_EMAIL:
              jobId = await this.sendTemplateEmail(
                job.templateName,
                job.recipients,
                job.templateData,
                job.options,
                job.priority,
                job.delay,
              );
              break;
            case MailQueueJobType.OTP_EMAIL:
              jobId = await this.sendOtpEmail(
                job.email,
                job.otpCode,
                job.requestId,
                job.templateData,
                job.priority,
                job.delay,
              );
              break;
            default:
              throw new Error(`Unknown job type: ${(job as any).type}`);
          }
          return jobId;
        } catch (error) {
          this.logger.error(`Failed to send job: ${job.jobId}`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          jobIds.push(result.value);
        }
      });

      // Add delay between batches to prevent overwhelming the queue
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(100);
      }
    }

    return jobIds;
  }

  /**
   * Get queue configuration
   */
  getConfig(): MailQueueConfig {
    return { ...this.config };
  }

  /**
   * Update queue configuration
   */
  updateConfig(newConfig: Partial<MailQueueConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.log('Mail queue configuration updated', this.config);
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
