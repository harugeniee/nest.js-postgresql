import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerService {
  constructor() {}
  testRABBIT(id: number) {
    return `This action removes a #${id} worker`;
  }
}
