import { Injectable, Logger } from '@nestjs/common';
import { BaseQrAction, QrActionContext } from './base-action';
import { QrActionType } from '../qr.types';

/**
 * Add Friend Action - Handles QR-based friend requests
 *
 * This action is executed when a user approves an ADD_FRIEND QR code.
 * It creates a friendship relationship between the user who scanned
 * the QR code and the user who created it.
 *
 * The payload should contain information about the friend to be added,
 * such as user ID, username, or other identifying information.
 */
@Injectable()
export class AddFriendAction extends BaseQrAction {
  private readonly logger = new Logger(AddFriendAction.name);

  /**
   * Returns the action type this class handles
   */
  type(): QrActionType {
    return QrActionType.ADD_FRIEND;
  }

  /**
   * Executes the add friend action
   *
   * This action:
   * 1. Validates the friend request
   * 2. Creates a friendship relationship
   * 3. Sends notifications to both users
   * 4. Logs the action for audit purposes
   *
   * @param ctx - The action context containing user and friend information
   */
  async execute(ctx: QrActionContext): Promise<void> {
    this.logger.log(
      `Executing ADD_FRIEND action for ticket ${ctx.tid} by user ${ctx.userId}`,
    );

    // Validate that payload contains friend information
    if (!ctx.payload?.friendUserId && !ctx.payload?.friendUsername) {
      throw new Error(
        'Friend user ID or username is required for ADD_FRIEND action',
      );
    }

    // TODO: Implement actual add friend logic
    // Examples of what should be implemented:

    // 1. Get friend user information
    // const friendUser = await this.userService.findByUsernameOrId(
    //   ctx.payload.friendUserId || ctx.payload.friendUsername
    // );
    // if (!friendUser) {
    //   throw new Error('Friend user not found');
    // }

    // 2. Check if friendship already exists
    // const existingFriendship = await this.friendshipService.findFriendship(
    //   ctx.userId,
    //   friendUser.id
    // );
    // if (existingFriendship) {
    //   throw new Error('Friendship already exists');
    // }

    // 3. Create the friendship
    // const friendship = await this.friendshipService.createFriendship({
    //   userId: ctx.userId,
    //   friendId: friendUser.id,
    //   status: 'PENDING', // or 'ACCEPTED' depending on your flow
    //   createdAt: new Date(ctx.approvedAt),
    //   source: 'QR_CODE',
    //   ticketId: ctx.tid,
    // });

    // 4. Send notification to friend
    // await this.notificationService.sendFriendRequest({
    //   toUserId: friendUser.id,
    //   fromUserId: ctx.userId,
    //   friendshipId: friendship.id,
    //   message: `${ctx.user.username} wants to be your friend`,
    // });

    // 5. Update user's friend count
    // await this.userService.incrementFriendCount(ctx.userId);
    // await this.userService.incrementFriendCount(friendUser.id);

    // 6. Log the action for audit
    // await this.auditService.logFriendRequest({
    //   userId: ctx.userId,
    //   friendId: friendUser.id,
    //   action: 'ADD_FRIEND',
    //   method: 'QR_CODE',
    //   ticketId: ctx.tid,
    //   timestamp: ctx.approvedAt,
    // });

    this.logger.log(
      `ADD_FRIEND action completed successfully for ticket ${ctx.tid}`,
    );
  }

  /**
   * Pre-execution hook for add friend action
   * Validates friend request requirements
   */
  protected async beforeExecute(ctx: QrActionContext): Promise<void> {
    this.logger.debug(
      `Pre-execution checks for ADD_FRIEND action on ticket ${ctx.tid}`,
    );

    // TODO: Add friend request validation logic
    // Examples:
    // - Check if user can send friend requests
    // - Verify friend request limits
    // - Check for blocked users

    // await this.friendshipService.validateFriendRequest(ctx.userId, ctx.payload?.friendUserId);
  }

  /**
   * Post-execution hook for add friend action
   * Handles post-friendship creation tasks
   */
  protected async afterExecute(ctx: QrActionContext): Promise<void> {
    this.logger.debug(
      `Post-execution cleanup for ADD_FRIEND action on ticket ${ctx.tid}`,
    );

    // TODO: Add post-friendship creation logic
    // Examples:
    // - Update user activity metrics
    // - Trigger friend suggestion algorithms
    // - Send welcome messages
  }
}
