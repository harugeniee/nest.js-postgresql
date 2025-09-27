import { NotificationPreference } from './notification-preference.entity';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('NotificationPreference Entity', () => {
  let preference: NotificationPreference;

  beforeEach(() => {
    preference = new NotificationPreference();
    preference.id = '1111111111111111111';
    preference.userId = '9876543210987654321';
    preference.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
    preference.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
    preference.enabled = true;
    preference.batched = false;
    preference.batchFrequency = undefined;
    preference.quietHoursStart = undefined;
    preference.quietHoursEnd = undefined;
    preference.timezone = 'UTC';
    preference.settings = undefined;
    preference.createdAt = new Date();
    preference.updatedAt = new Date();
  });

  describe('shouldSendInQuietHours', () => {
    it('should return true when no quiet hours are set', () => {
      preference.quietHoursStart = undefined;
      preference.quietHoursEnd = undefined;

      expect(preference.shouldSendInQuietHours()).toBe(true);
    });

    it('should return true when current time is outside quiet hours (same day)', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time outside quiet hours (10:00 AM)
      const testDate = new Date('2024-01-01T10:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(true);
    });

    it('should return false when current time is within quiet hours (same day)', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time within quiet hours (23:00)
      const testDate = new Date('2024-01-01T23:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(false);
    });

    it('should return true when current time is outside quiet hours (overnight)', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time outside quiet hours (09:00 AM)
      const testDate = new Date('2024-01-01T09:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(true);
    });

    it('should return false when current time is within quiet hours (overnight)', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time within quiet hours (02:00 AM)
      const testDate = new Date('2024-01-01T02:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(false);
    });

    it('should handle edge case at quiet hours start time', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time exactly at quiet hours start
      const testDate = new Date('2024-01-01T22:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(false);
    });

    it('should handle edge case at quiet hours end time', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'UTC';

      // Test time exactly at quiet hours end
      const testDate = new Date('2024-01-01T08:00:00Z');
      expect(preference.shouldSendInQuietHours(testDate)).toBe(true);
    });
  });

  describe('shouldSend', () => {
    it('should return true when enabled and outside quiet hours', () => {
      preference.enabled = true;
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';

      const testDate = new Date('2024-01-01T10:00:00Z');
      expect(preference.shouldSend(testDate)).toBe(true);
    });

    it('should return false when disabled', () => {
      preference.enabled = false;
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';

      const testDate = new Date('2024-01-01T10:00:00Z');
      expect(preference.shouldSend(testDate)).toBe(false);
    });

    it('should return false when enabled but within quiet hours', () => {
      preference.enabled = true;
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';

      const testDate = new Date('2024-01-01T23:00:00Z');
      expect(preference.shouldSend(testDate)).toBe(false);
    });

    it('should return false when disabled and within quiet hours', () => {
      preference.enabled = false;
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';

      const testDate = new Date('2024-01-01T23:00:00Z');
      expect(preference.shouldSend(testDate)).toBe(false);
    });

    it('should use current date when no date is provided', () => {
      preference.enabled = true;
      preference.quietHoursStart = undefined;
      preference.quietHoursEnd = undefined;

      // Mock the current time
      const mockDate = new Date('2024-01-01T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(preference.shouldSend()).toBe(true);

      // Restore original Date
      jest.restoreAllMocks();
    });
  });

  describe('timezone handling', () => {
    it('should handle different timezones correctly', () => {
      preference.quietHoursStart = '22:00';
      preference.quietHoursEnd = '08:00';
      preference.timezone = 'America/New_York';

      // Test with a date that would be within quiet hours in UTC but outside in EST
      const testDate = new Date('2024-01-01T03:00:00Z'); // 10 PM EST (previous day)
      expect(preference.shouldSendInQuietHours(testDate)).toBe(false);
    });
  });
});
