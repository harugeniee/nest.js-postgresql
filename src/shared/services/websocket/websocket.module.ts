import { Global, Module } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { WebSocketGatewayController } from './websocket.gateway';
import { WebSocketExampleService } from './websocket.example.service';

@Global()
@Module({
  providers: [
    WebSocketService,
    WebSocketGatewayController,
    WebSocketExampleService,
  ],
  exports: [
    WebSocketService,
    WebSocketGatewayController,
    WebSocketExampleService,
  ],
})
export class WebSocketModule {}
