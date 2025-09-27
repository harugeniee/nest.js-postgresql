import { BroadcastNotification } from './broadcast-notification.entity';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('BroadcastNotification Entity', () => {
  let broadcast: BroadcastNotification;

  beforeEach(() => {
    broadcast = new BroadcastNotification();
    broadcast.id = '1234567890123456789';
    broadcast.title = 'System Maintenance';
    broadcast.message = 'We will perform maintenance on our servers';
    broadcast.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
    broadcast.priority = NOTIFICATION_CONSTANTS.PRIORITY.HIGH;
    broadcast.isActive = true;
    broadcast.actionUrl = 'https://example.com/maintenance';
    broadcast.metadata = { maintenanceWindow: '2 hours' };
    broadcast.createdAt = new Date();
    broadcast.updatedAt = new Date();
  });

  describe('isCurrentlyActive', () => {
    it('should return true when active and not expired', () => {
      broadcast.isActive = true;
      broadcast.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      expect(broadcast.isCurrentlyActive()).toBe(true);
    });

    it('should return false when inactive', () => {
      broadcast.isActive = false;
      broadcast.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(broadcast.isCurrentlyActive()).toBe(false);
    });

    it('should return false when expired', () => {
      broadcast.isActive = true;
      broadcast.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      expect(broadcast.isCurrentlyActive()).toBe(false);
    });

    it('should return true when active and no expiration date', () => {
      broadcast.isActive = true;
      broadcast.expiresAt = undefined;

      expect(broadcast.isCurrentlyActive()).toBe(true);
    });

    it('should return false when inactive and no expiration date', () => {
      broadcast.isActive = false;
      broadcast.expiresAt = undefined;

      expect(broadcast.isCurrentlyActive()).toBe(false);
    });

    it('should return false when inactive and expired', () => {
      broadcast.isActive = false;
      broadcast.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

      expect(broadcast.isCurrentlyActive()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return true when expired', () => {
      broadcast.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      expect(broadcast.isExpired()).toBe(true);
    });

    it('should return false when not expired', () => {
      broadcast.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      expect(broadcast.isExpired()).toBe(false);
    });

    it('should return false when no expiration date', () => {
      broadcast.expiresAt = undefined;

      expect(broadcast.isExpired()).toBe(false);
    });

    it('should return true when exactly at expiration time', () => {
      const now = new Date();
      broadcast.expiresAt = now;

      // Mock the current time to be exactly at expiration
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      expect(broadcast.isExpired()).toBe(true);

      // Restore original Date
      jest.restoreAllMocks();
    });
  });

  describe('edge cases', () => {
    it('should handle null expiration date in isCurrentlyActive', () => {
      broadcast.isActive = true;
      broadcast.expiresAt = null as any;

      expect(broadcast.isCurrentlyActive()).toBe(true);
    });

    it('should handle null expiration date in isExpired', () => {
      broadcast.expiresAt = null as any;

      expect(broadcast.isExpired()).toBe(false);
    });

    it('should handle very recent expiration', () => {
      const now = new Date();
      broadcast.expiresAt = new Date(now.getTime() - 1); // 1ms ago

      expect(broadcast.isExpired()).toBe(true);
      expect(broadcast.isCurrentlyActive()).toBe(false);
    });

    it('should handle very near future expiration', () => {
      const now = new Date();
      broadcast.expiresAt = new Date(now.getTime() + 1000); // 1 second from now

      expect(broadcast.isExpired()).toBe(false);
      expect(broadcast.isCurrentlyActive()).toBe(true);
    });
  });

  describe('real-time behavior', () => {
    it('should correctly evaluate current time', (done) => {
      broadcast.isActive = true;
      broadcast.expiresAt = new Date(Date.now() + 1000); // 1 second from now

      // Should be active now
      expect(broadcast.isCurrentlyActive()).toBe(true);
      expect(broadcast.isExpired()).toBe(false);

      // Wait for expiration
      const timeoutId = setTimeout(() => {
        expect(broadcast.isCurrentlyActive()).toBe(false);
        expect(broadcast.isExpired()).toBe(true);
        done(); // Tell Jest the test is complete
      }, 1100);

      // Clean up timeout on test failure
      timeoutId.unref();
    });
  });
});
