import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { JOB_NAME } from 'src/shared/constants';

@Injectable()
export class RabbitmqService implements OnModuleInit {
  constructor(@Inject('WORKER_SERVICE') private readonly client: ClientProxy) {}

  onModuleInit() {
    // Start sending messages every 3 seconds
    this.testRmq();
  }

  testRmq(): boolean {
    try {
      const data = {
        test: `${new Date().toLocaleDateString()}`,
      };
      console.log('testRmq data', data);
      this.client.emit(JOB_NAME.TEST_RABBIT, JSON.stringify(data));
      // this.client.send(JOB_NAME.TEST_RABBIT, JSON.stringify(data));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  sendDataToRabbitMQ(jobName: string, data: any) {
    try {
      this.client.emit(jobName, JSON.stringify(data));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
