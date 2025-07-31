import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}
  testRABBIT(id: number) {
    return `This action removes a #${id} worker`;
  }
}
