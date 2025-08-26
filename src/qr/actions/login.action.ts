import { Injectable, Logger } from '@nestjs/common';
import { BaseQrAction, QrActionContext } from './base-action';
import { QR_ACTION_TYPES, QrActionType } from 'src/shared/constants';

/**
 * Login Action - Handles QR-based login requests
 *
 * This action is executed when a user approves a LOGIN QR code.
 * The actual JWT token generation happens in the QR service when
 * the grant is exchanged, not in this action.
 *
 * This action can be used to:
 * - Log the login attempt for audit purposes
 * - Update user's last login timestamp
 * - Trigger any post-login workflows
 * - Send notifications about successful login
 */
@Injectable()
export class LoginAction extends BaseQrAction {
  private readonly logger = new Logger(LoginAction.name);

  /**
   * Returns the action type this class handles
   */
  type(): QrActionType {
    return QR_ACTION_TYPES.LOGIN;
  }

  /**
   * Executes the login action
   *
   * For QR-based login, this action is primarily used for:
   * 1. Audit logging
   * 2. Post-login workflows
   * 3. Security monitoring
   *
   * The actual authentication and JWT generation happens in the
   * QR service when the grant token is exchanged.
   *
   * @param ctx - The action context containing user and ticket information
   */
  async execute(ctx: QrActionContext): Promise<void> {
    this.logger.log(
      `Executing LOGIN action for ticket ${ctx.tid} by user ${ctx.userId}`,
    );

    // TODO: Implement actual login action logic
    // Examples of what could be done here:

    // 1. Audit logging
    // await this.auditService.logLogin({
    //   userId: ctx.userId,
    //   method: 'QR_CODE',
    //   ticketId: ctx.tid,
    //   webSessionId: ctx.webSessionId,
    //   timestamp: ctx.approvedAt,
    //   ipAddress: ctx.clientInfo?.ipAddress,
    //   userAgent: ctx.clientInfo?.userAgent,
    // });

    // 2. Update user's last login timestamp
    // await this.userService.updateLastLogin(ctx.userId, new Date(ctx.approvedAt));

    // 3. Send login notification
    // await this.notificationService.sendLoginNotification(ctx.userId, {
    //   method: 'QR_CODE',
    //   timestamp: ctx.approvedAt,
    //   location: ctx.clientInfo?.location,
    // });

    // 4. Trigger security checks
    // await this.securityService.checkLoginAnomalies(ctx.userId, {
    //   method: 'QR_CODE',
    //   timestamp: ctx.approvedAt,
    //   webSessionId: ctx.webSessionId,
    // });

    this.logger.log(
      `LOGIN action completed successfully for ticket ${ctx.tid}`,
    );
  }

  /**
   * Pre-execution hook for login action
   * Can be used to validate login-specific requirements
   */
  protected async beforeExecute(ctx: QrActionContext): Promise<void> {
    this.logger.debug(
      `Pre-execution checks for LOGIN action on ticket ${ctx.tid}`,
    );

    // TODO: Add login-specific validation logic
    // Examples:
    // - Check if user account is active
    // - Verify user has permission to login via QR
    // - Check for any pending security requirements

    // await this.userService.validateLoginEligibility(ctx.userId);
  }

  /**
   * Post-execution hook for login action
   * Can be used for cleanup or follow-up actions
   */
  protected async afterExecute(ctx: QrActionContext): Promise<void> {
    this.logger.debug(
      `Post-execution cleanup for LOGIN action on ticket ${ctx.tid}`,
    );

    // TODO: Add post-login cleanup logic
    // Examples:
    // - Clear any temporary login tokens
    // - Update user activity metrics
    // - Trigger post-login workflows
  }
}
