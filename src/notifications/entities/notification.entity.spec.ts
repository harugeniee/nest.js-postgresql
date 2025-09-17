import { Notification } from './notification.entity';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('Notification Entity', () => {
  let notification: Notification;

  beforeEach(() => {
    notification = new Notification();
    notification.id = '1234567890123456789';
    notification.userId = '9876543210987654321';
    notification.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
    notification.title = 'Your article was liked!';
    notification.message = 'John Doe liked your article';
    notification.status = NOTIFICATION_CONSTANTS.STATUS.PENDING;
    notification.priority = NOTIFICATION_CONSTANTS.PRIORITY.NORMAL;
    notification.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
    notification.isRead = false;
    notification.retryCount = 0;
    notification.maxRetries = 3;
    notification.createdAt = new Date();
    notification.updatedAt = new Date();
  });

  describe('isPending', () => {
    it('should return true when status is pending', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.PENDING;
      expect(notification.isPending()).toBe(true);
    });

    it('should return false when status is not pending', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
      expect(notification.isPending()).toBe(false);
    });
  });

  describe('isSent', () => {
    it('should return true when status is sent', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
      expect(notification.isSent()).toBe(true);
    });

    it('should return false when status is not sent', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.PENDING;
      expect(notification.isSent()).toBe(false);
    });
  });

  describe('isDelivered', () => {
    it('should return true when status is delivered', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.DELIVERED;
      expect(notification.isDelivered()).toBe(true);
    });

    it('should return false when status is not delivered', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
      expect(notification.isDelivered()).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return true when status is failed', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.FAILED;
      expect(notification.isFailed()).toBe(true);
    });

    it('should return false when status is not failed', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
      expect(notification.isFailed()).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should return true when failed and retry count is less than max retries', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.FAILED;
      notification.retryCount = 1;
      notification.maxRetries = 3;
      expect(notification.canRetry()).toBe(true);
    });

    it('should return false when not failed', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
      notification.retryCount = 1;
      notification.maxRetries = 3;
      expect(notification.canRetry()).toBe(false);
    });

    it('should return false when retry count equals max retries', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.FAILED;
      notification.retryCount = 3;
      notification.maxRetries = 3;
      expect(notification.canRetry()).toBe(false);
    });

    it('should return false when retry count exceeds max retries', () => {
      notification.status = NOTIFICATION_CONSTANTS.STATUS.FAILED;
      notification.retryCount = 4;
      notification.maxRetries = 3;
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and set readAt timestamp', () => {
      const beforeMark = new Date();
      notification.markAsRead();
      const afterMark = new Date();

      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBeDefined();
      expect(notification.readAt!.getTime()).toBeGreaterThanOrEqual(
        beforeMark.getTime(),
      );
      expect(notification.readAt!.getTime()).toBeLessThanOrEqual(
        afterMark.getTime(),
      );
    });
  });

  describe('markAsSent', () => {
    it('should mark notification as sent and set sentAt timestamp', () => {
      const beforeMark = new Date();
      notification.markAsSent();
      const afterMark = new Date();

      expect(notification.status).toBe(NOTIFICATION_CONSTANTS.STATUS.SENT);
      expect(notification.sentAt).toBeDefined();
      expect(notification.sentAt!.getTime()).toBeGreaterThanOrEqual(
        beforeMark.getTime(),
      );
      expect(notification.sentAt!.getTime()).toBeLessThanOrEqual(
        afterMark.getTime(),
      );
    });
  });

  describe('markAsDelivered', () => {
    it('should mark notification as delivered and set deliveredAt timestamp', () => {
      const beforeMark = new Date();
      notification.markAsDelivered();
      const afterMark = new Date();

      expect(notification.status).toBe(NOTIFICATION_CONSTANTS.STATUS.DELIVERED);
      expect(notification.deliveredAt).toBeDefined();
      expect(notification.deliveredAt!.getTime()).toBeGreaterThanOrEqual(
        beforeMark.getTime(),
      );
      expect(notification.deliveredAt!.getTime()).toBeLessThanOrEqual(
        afterMark.getTime(),
      );
    });
  });

  describe('markAsFailed', () => {
    it('should mark notification as failed, set error message and increment retry count', () => {
      const errorMessage = 'Connection timeout';
      const initialRetryCount = notification.retryCount;

      notification.markAsFailed(errorMessage);

      expect(notification.status).toBe(NOTIFICATION_CONSTANTS.STATUS.FAILED);
      expect(notification.errorMessage).toBe(errorMessage);
      expect(notification.retryCount).toBe(initialRetryCount + 1);
    });
  });
});
