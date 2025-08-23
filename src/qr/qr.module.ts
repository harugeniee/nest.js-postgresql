import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { QrGateway } from './qr.gateway';
import { QrActionExecutorService } from './qr-action-executor.service';
import { LoginAction } from './actions/login.action';
import { AddFriendAction } from './actions/add-friend.action';
import { JoinOrgAction } from './actions/join-org.action';
import { PairAction } from './actions/pair.action';

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
  ],
  controllers: [QrController],
  providers: [
    // Core services
    QrService,
    QrGateway,
    QrActionExecutorService,

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
  constructor(private readonly actionExecutor: QrActionExecutorService) {}

  /**
   * Module initialization hook
   * Validates that all required actions are properly registered
   */
  onModuleInit(): void {
    try {
      // Validate the action registry
      this.actionExecutor.validateActionRegistry();

      console.log('✅ QR Module initialized successfully');
      console.log(
        '📱 Supported actions:',
        this.actionExecutor.getSupportedActionTypes(),
      );
    } catch (error) {
      console.error('❌ QR Module initialization failed:', error);
      throw error;
    }
  }
}
