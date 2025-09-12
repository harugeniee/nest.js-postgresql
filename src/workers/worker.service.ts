import { Injectable, Logger } from '@nestjs/common';
import { MailService } from 'src/shared/services/mail/mail.service';
import { maskEmail } from 'src/common/utils';
import {
  SingleEmailQueueJob,
  BatchEmailQueueJob,
  TemplateEmailQueueJob,
  OtpEmailQueueJob,
  MailQueueJobResult,
} from 'src/shared/services/mail/mail-queue.interface';
import { CommentsService } from 'src/comments/comments.service';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly commentsService: CommentsService,
  ) {}

  testRABBIT(id: number) {
    return `This action removes a #${id} worker`;
  }

  /**
   * Process single email job
   */
  async processSingleEmail(
    job: SingleEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(`Processing single email job: ${job.jobId}`);

    try {
      const result = await this.mailService.sendMail(job.mailOptions);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Single email job completed: ${job.jobId}, success: ${result.success}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Single email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process batch email job
   */
  async processBatchEmail(
    job: BatchEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing batch email job: ${job.jobId}, recipients: ${job.recipients.length}`,
    );

    try {
      const result = await this.mailService.sendMailBatch(
        job.mailOptions,
        job.recipients,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Batch email job completed: ${job.jobId}, success: ${result.success}, sent: ${result.totalSent}, failed: ${result.totalFailed}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Batch email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process template email job
   */
  async processTemplateEmail(
    job: TemplateEmailQueueJob,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing template email job: ${job.jobId}, template: ${job.templateName}`,
    );

    try {
      const result = await this.mailService.sendTemplateMail(
        job.templateName,
        job.recipients,
        job.templateData,
        job.options,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Template email job completed: ${job.jobId}, success: ${result.success}`,
      );

      return {
        jobId: job.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Template email job failed: ${job.jobId}`, error);

      return {
        jobId: job.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process OTP email job
   */
  async processOtpEmail(
    job: OtpEmailQueueJob | string,
  ): Promise<MailQueueJobResult> {
    const startTime = Date.now();
    const jobData =
      typeof job === 'string' ? (JSON.parse(job) as OtpEmailQueueJob) : job;
    console.log('jobData', jobData);
    this.logger.log(
      `Processing OTP email job: ${jobData.jobId}, email: ${maskEmail(jobData.email)}`,
    );

    try {
      const result = await this.mailService.sendTemplateMail(
        'otp-login',
        { email: jobData.email },
        {
          otpCode: jobData.otpCode,
          requestId: jobData.requestId,
          appName: process.env.APP_NAME || 'NestJS App',
          appUrl: process.env.APP_URL || 'http://localhost:3000',
          supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
          companyName: process.env.COMPANY_NAME || 'Your Company',
          ...jobData.templateData,
        },
        {
          priority: 'high',
          headers: {
            'X-OTP-Request-ID': jobData.requestId,
            'X-OTP-Type': 'login',
          },
        },
      );
      console.log(result);
      const processingTime = Date.now() - startTime;
      this.logger.log(
        `OTP email job completed: ${jobData.jobId}, success: ${result.success}`,
      );

      return {
        jobId: jobData.jobId,
        success: result.success,
        error: result.error,
        processingTime,
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`OTP email job failed: ${jobData.jobId}`, error);

      return {
        jobId: jobData.jobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Process comment created event
   * Handles notifications, analytics, and other post-creation tasks
   */
  async processCommentCreated(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment created event: ${data}`);

    try {
      // Update reply count for parent comment if this is a reply
      if (data.parentId) {
        await this.commentsService.updateReplyCount(data.parentId, true);
        this.logger.log(
          `Updated reply count for parent comment: ${data.parentId}`,
        );
      }

      // TODO: Add other comment created processing logic here
      // Examples:
      // - Send notifications to mentioned users
      // - Update comment statistics
      // - Trigger moderation checks
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment created event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment created event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment updated event
   * Handles notifications, analytics, and other post-update tasks
   */
  async processCommentUpdated(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment updated event: ${data}`);

    try {
      // TODO: Add comment updated processing logic here
      // Examples:
      // - Send notifications to subscribers
      // - Update comment statistics
      // - Trigger moderation checks for edited content
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment updated event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment updated event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment deleted event
   * Handles cleanup, notifications, and other post-deletion tasks
   */
  async processCommentDeleted(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment deleted event: ${data}`);

    try {
      // Update reply count for parent comment if this was a reply
      if (data.parentId) {
        await this.commentsService.updateReplyCount(data.parentId, false);
        this.logger.log(
          `Decremented reply count for parent comment: ${data.parentId}`,
        );
      }

      // TODO: Add other comment deleted processing logic here
      // Examples:
      // - Clean up related data (reactions, attachments, etc.)
      // - Send notifications to subscribers
      // - Update comment statistics
      // - Send WebSocket notifications
      // - Update search indexes
      // - Log analytics events
      // - Handle soft delete vs hard delete logic

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment deleted event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment deleted event: ${data}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process comment pinned event
   * Handles notifications and other post-pin tasks
   */
  async processCommentPinned(data: any): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Processing comment pinned event: ${data}`);

    try {
      // TODO: Add comment pinned processing logic here
      // Examples:
      // - Send notifications to relevant users
      // - Update comment statistics
      // - Send WebSocket notifications
      // - Log analytics events
      // - Update pinned comment lists

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Comment pinned event processed: ${data}, time: ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing comment pinned event: ${data}`,
        error,
      );
      throw error;
    }
  }
}
