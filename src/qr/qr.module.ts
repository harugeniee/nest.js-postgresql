import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { I18nWsExceptionFilter } from '../common/filters/ws-exception.filter';
import { AddFriendAction } from './actions/add-friend.action';
import { JoinOrgAction } from './actions/join-org.action';
import { LoginAction } from './actions/login.action';
import { PairAction } from './actions/pair.action';
import { QrTicket } from './entities/qr.entity';
import { QrActionExecutorService } from './qr-action-executor.service';
import { QrController } from './qr.controller';
import { QrGateway } from './qr.gateway';
import { QrService } from './qr.service';

/**
 * QR Module - Complete QR Actions feature implementation
 *
 * This module provides:
 * - QR ticket creation and management
 * - Real-time WebSocket status updates
 * - Action execution framework
 * - PKCE security implementation
 * - Redis-based state management
 *
 * Dependencies:
 * - CacheModule (Redis) - for ticket and grant storage
 * - ConfigModule - for configuration values
 * - WebSocket support - for real-time updates
 */
@Module({
  imports: [
    // Import ConfigModule to access environment variables
    ConfigModule,
    TypeOrmModule.forFeature([QrTicket]),
  ],
  controllers: [QrController],
  providers: [
    // Core services
    QrService,
    QrGateway,
    QrActionExecutorService,

    // WebSocket exception filter
    I18nWsExceptionFilter,

    // Action implementations
    LoginAction,
    AddFriendAction,
    JoinOrgAction,
    PairAction,
  ],
  exports: [
    // Export services for use in other modules
    QrService,
    QrGateway,
    QrActionExecutorService,
  ],
})
export class QrModule implements OnModuleInit {
  private readonly logger = new Logger(QrModule.name);

  constructor(private readonly actionExecutor: QrActionExecutorService) {}

  /**
   * Module initialization hook
   * Validates that all required actions are properly registered
   */
  onModuleInit(): void {
    try {
      // Validate the action registry
      this.actionExecutor.validateActionRegistry();

      this.logger.log('✅ QR Module initialized successfully');
      this.logger.log(
        '📱 Supported actions:',
        this.actionExecutor.getSupportedActionTypes(),
      );
    } catch (error) {
      this.logger.error('❌ QR Module initialization failed:', error);
      throw error;
    }
  }
}
