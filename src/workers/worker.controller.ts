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
}
