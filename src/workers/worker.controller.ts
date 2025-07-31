import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

import { JOB_NAME } from '../shared/constants';
import { WorkerService } from './worker.service';

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
}
