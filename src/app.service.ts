import { Injectable } from '@nestjs/common';
import { buildResponse } from './shared/helpers/build-response';

@Injectable()
export class AppService {
  getHello() {
    return buildResponse({
      data: { message: 'Open World!' },
    });
  }
}
