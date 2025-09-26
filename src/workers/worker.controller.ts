import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

import { JOB_NAME } from 'src/shared/constants';
import { WorkerService } from './worker.service';
import {
  SingleEmailQueueJob,
  BatchEmailQueueJob,
  TemplateEmailQueueJob,
  OtpEmailQueueJob,
} from 'src/shared/services/mail/mail-queue.interface';
import {
  ShareCreatedJob,
  ShareDeletedJob,
  ShareCountUpdateJob,
} from 'src/share/interfaces/share-queue.interface';

@Controller()
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  // @EventPattern(JOB_NAME.TEST_RABBIT)
  @MessagePattern(JOB_NAME.TEST_RABBIT)
  testRmq(@Payload() data: number[], @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('testRmq received', data);
      // Process the message here

      // Acknowledge the message after successful processing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing message:', error);
      // Negative acknowledgment - message will be requeued
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.MAIL_SINGLE)
  async processSingleEmail(
    @Payload() job: SingleEmailQueueJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.workerService.processSingleEmail(job);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing single email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.MAIL_BATCH)
  async processBatchEmail(
    @Payload() job: BatchEmailQueueJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.workerService.processBatchEmail(job);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing batch email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.MAIL_TEMPLATE)
  async processTemplateEmail(
    @Payload() job: TemplateEmailQueueJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.workerService.processTemplateEmail(job);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing template email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.MAIL_OTP)
  async processOtpEmail(
    @Payload() job: OtpEmailQueueJob | string,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.workerService.processOtpEmail(job);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing OTP email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.REACTION_SET)
  async handleReactionSet(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Reaction set event received:', data);
      // Process reaction set event here
      // You can add logic to update other systems, send notifications, etc.

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing reaction set event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.REACTION_UNSET)
  async handleReactionUnset(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Reaction unset event received:', data);
      // Process reaction unset event here
      // You can add logic to update other systems, send notifications, etc.

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing reaction unset event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.COMMENT_CREATED)
  async handleCommentCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Comment created event received:', data);
      // Process comment created event here
      // You can add logic to send notifications, update analytics, etc.

      await this.workerService.processCommentCreated(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing comment created event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.COMMENT_UPDATED)
  async handleCommentUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Comment updated event received:', data);
      // Process comment updated event here
      // You can add logic to send notifications, update analytics, etc.

      await this.workerService.processCommentUpdated(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing comment updated event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.COMMENT_DELETED)
  async handleCommentDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Comment deleted event received:', data);
      // Process comment deleted event here
      // You can add logic to clean up related data, send notifications, etc.

      await this.workerService.processCommentDeleted(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing comment deleted event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.COMMENT_PINNED)
  async handleCommentPinned(@Payload() data: any, @Ctx() context: RmqContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Comment pinned event received:', data);
      // Process comment pinned event here
      // You can add logic to send notifications, update analytics, etc.

      await this.workerService.processCommentPinned(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing comment pinned event:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  // Notification job handlers
  @MessagePattern('notification.send_email')
  async handleNotificationEmail(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Notification email job received:', data);

      await this.workerService.processNotificationEmail(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing notification email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern('notification.send_push')
  async handleNotificationPush(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Notification push job received:', data);

      await this.workerService.processNotificationPush(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing notification push:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern('notification.send_in_app')
  async handleNotificationInApp(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Notification in-app job received:', data);

      await this.workerService.processNotificationInApp(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing notification in-app:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern('notification.batch_email')
  async handleNotificationBatchEmail(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Notification batch email job received:', data);

      await this.workerService.processNotificationBatchEmail(data);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing notification batch email:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  // ==================== SHARE PROCESSING METHODS ====================

  @MessagePattern(JOB_NAME.SHARE_CREATED)
  async handleShareCreated(
    @Payload() job: ShareCreatedJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Share created job received:', job);

      await this.workerService.processShareCreated(job);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing share created:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.SHARE_DELETED)
  async handleShareDeleted(
    @Payload() job: ShareDeletedJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Share deleted job received:', job);

      await this.workerService.processShareDeleted(job);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing share deleted:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }

  @MessagePattern(JOB_NAME.SHARE_COUNT_UPDATE)
  async handleShareCountUpdate(
    @Payload() job: ShareCountUpdateJob,
    @Ctx() context: RmqContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Share count update job received:', job);

      await this.workerService.processShareCountUpdate(job);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.ack(originalMsg);
    } catch (error: unknown) {
      console.log('Error processing share count update:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel.nack(originalMsg, false, true);
    }
  }
}
