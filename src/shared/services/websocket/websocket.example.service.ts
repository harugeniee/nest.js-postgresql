import { Injectable, Logger } from '@nestjs/common';

import { WebSocketService } from './websocket.service';

// Interface for notification data
export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId?: string;
  roomName?: string;
  metadata?: Record<string, unknown>;
}

// Interface for chat message data
export interface ChatMessageData {
  userId: string;
  username: string;
  message: string;
  roomName: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'file';
}

// Interface for user status data
export interface UserStatusData {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WebSocketExampleService {
  private readonly logger = new Logger(WebSocketExampleService.name);

  constructor(private readonly webSocketService: WebSocketService) {}

  /**
   * Send notification to all users
   * @param notification - Notification data to send
   */
  async sendGlobalNotification(notification: NotificationData): Promise<void> {
    try {
      this.webSocketService.broadcastToAll('global-notification', {
        ...notification,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId(),
      });

      this.logger.log(`📢 Global notification sent: ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to send global notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific user
   * @param notification - Notification data to send
   */
  async sendUserNotification(notification: NotificationData): Promise<boolean> {
    try {
      if (!notification.userId) {
        throw new Error('User ID is required for user-specific notifications');
      }

      const success = this.webSocketService.sendToUser(
        notification.userId,
        'user-notification',
        {
          ...notification,
          timestamp: new Date().toISOString(),
          id: this.generateNotificationId(),
        },
      );

      if (success) {
        this.logger.log(
          `📱 User notification sent to ${notification.userId}: ${notification.title}`,
        );
      } else {
        this.logger.warn(
          `⚠️ User ${notification.userId} is offline, notification not sent`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to send user notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific room
   * @param notification - Notification data to send
   */
  async sendRoomNotification(notification: NotificationData): Promise<void> {
    try {
      if (!notification.roomName) {
        throw new Error(
          'Room name is required for room-specific notifications',
        );
      }

      this.webSocketService.broadcastToRoom(
        notification.roomName,
        'room-notification',
        {
          ...notification,
          timestamp: new Date().toISOString(),
          id: this.generateNotificationId(),
        },
      );

      this.logger.log(
        `🏠 Room notification sent to ${notification.roomName}: ${notification.title}`,
      );
    } catch (error) {
      this.logger.error('Failed to send room notification:', error);
      throw error;
    }
  }

  /**
   * Send chat message to room
   * @param chatMessage - Chat message data to send
   */
  async sendChatMessage(chatMessage: ChatMessageData): Promise<void> {
    try {
      this.webSocketService.broadcastToRoom(
        chatMessage.roomName,
        'chat-message',
        {
          ...chatMessage,
          timestamp: new Date().toISOString(),
          id: this.generateMessageId(),
        },
      );

      this.logger.log(
        `💬 Chat message sent to room ${chatMessage.roomName} by ${chatMessage.username}`,
      );
    } catch (error) {
      this.logger.error('Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Notify users about typing status
   * @param roomName - Room name where typing is happening
   * @param userId - User ID who is typing
   * @param username - Username of the typing user
   */
  async notifyTyping(
    roomName: string,
    userId: string,
    username: string,
  ): Promise<void> {
    try {
      this.webSocketService.broadcastToRoom(
        roomName,
        'user-typing',
        {
          userId,
          username,
          timestamp: new Date().toISOString(),
        },
        { exclude: [userId] },
      );

      this.logger.debug(
        `⌨️ Typing notification sent for user ${username} in room ${roomName}`,
      );
    } catch (error) {
      this.logger.error('Failed to send typing notification:', error);
      throw error;
    }
  }

  /**
   * Send user status update
   * @param userStatus - User status data to send
   */
  async sendUserStatusUpdate(userStatus: UserStatusData): Promise<void> {
    try {
      // Send to all users (for online/offline status)
      this.webSocketService.broadcastToAll('user-status-update', {
        ...userStatus,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `👤 User status update sent for ${userStatus.userId}: ${userStatus.status}`,
      );
    } catch (error) {
      this.logger.error('Failed to send user status update:', error);
      throw error;
    }
  }

  /**
   * Send system announcement
   * @param title - Announcement title
   * @param message - Announcement message
   * @param priority - Priority level of the announcement
   */
  async sendSystemAnnouncement(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<void> {
    try {
      const announcement = {
        title,
        message,
        priority,
        type: 'system' as const,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId(),
      };

      this.webSocketService.broadcastToAll('system-announcement', announcement);

      this.logger.log(
        `📢 System announcement sent: ${title} (Priority: ${priority})`,
      );
    } catch (error) {
      this.logger.error('Failed to send system announcement:', error);
      throw error;
    }
  }

  /**
   * Send welcome message to new user
   * @param userId - New user's ID
   * @param username - New user's username
   */
  async sendWelcomeMessage(userId: string, username: string): Promise<void> {
    try {
      // Send welcome message to the new user
      this.webSocketService.sendToUser(userId, 'welcome-message', {
        message: `Welcome to our platform, ${username}!`,
        username,
        timestamp: new Date().toISOString(),
        features: [
          'Real-time chat',
          'Instant notifications',
          'Live updates',
          'User status tracking',
        ],
      });

      // Notify other users about new user
      this.webSocketService.broadcastToAll(
        'new-user-joined',
        {
          userId,
          username,
          timestamp: new Date().toISOString(),
        },
        { exclude: [userId] },
      );

      this.logger.log(`🎉 Welcome message sent to new user: ${username}`);
    } catch (error) {
      this.logger.error('Failed to send welcome message:', error);
      throw error;
    }
  }

  /**
   * Send maintenance notification
   * @param message - Maintenance message
   * @param estimatedDuration - Estimated duration of maintenance
   * @param startTime - When maintenance will start
   */
  async sendMaintenanceNotification(
    message: string,
    estimatedDuration: string,
    startTime: string,
  ): Promise<void> {
    try {
      const maintenanceInfo = {
        message,
        estimatedDuration,
        startTime,
        type: 'maintenance' as const,
        timestamp: new Date().toISOString(),
        id: this.generateNotificationId(),
      };

      this.webSocketService.broadcastToAll(
        'maintenance-notification',
        maintenanceInfo,
      );

      this.logger.log(`🔧 Maintenance notification sent: ${message}`);
    } catch (error) {
      this.logger.error('Failed to send maintenance notification:', error);
      throw error;
    }
  }

  /**
   * Get online users count
   * @returns Number of online users
   */
  getOnlineUsersCount(): number {
    return this.webSocketService.getConnectionCount();
  }

  /**
   * Get active rooms count
   * @returns Number of active rooms
   */
  getActiveRoomsCount(): number {
    return this.webSocketService.getRoomCount();
  }

  /**
   * Check if specific user is online
   * @param userId - User ID to check
   * @returns true if user is online, false otherwise
   */
  isUserOnline(userId: string): boolean {
    return this.webSocketService.isUserOnline(userId);
  }

  /**
   * Get user's active connections
   * @param userId - User ID to get connections for
   * @returns Array of connection IDs
   */
  getUserConnections(userId: string): string[] {
    return this.webSocketService.getUserConnections(userId);
  }

  /**
   * Generate unique notification ID
   * @returns Unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   * @returns Unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
