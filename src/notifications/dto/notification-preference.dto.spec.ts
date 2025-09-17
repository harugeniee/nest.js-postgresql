import { validate } from 'class-validator';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  BulkUpdateNotificationPreferencesDto,
} from './notification-preference.dto';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('CreateNotificationPreferenceDto', () => {
  let dto: CreateNotificationPreferenceDto;

  beforeEach(() => {
    dto = new CreateNotificationPreferenceDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.enabled = true;
      dto.batched = false;
      dto.batchFrequency = 60;
      dto.quietHoursStart = '22:00';
      dto.quietHoursEnd = '08:00';
      dto.timezone = 'UTC';
      dto.settings = { priority: 'high' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when type is missing', async () => {
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation when channel is missing', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('channel');
    });

    it('should fail validation with invalid type', async () => {
      dto.type = 'invalid_type' as any;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation with invalid channel', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = 'invalid_channel' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('channel');
    });

    it('should fail validation with invalid batchFrequency (too low)', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.batchFrequency = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('batchFrequency');
    });

    it('should fail validation with invalid batchFrequency (too high)', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.batchFrequency = 1500; // More than 1440 minutes (24 hours)

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('batchFrequency');
    });

    it('should pass validation with minimal required fields', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid batchFrequency range', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.batchFrequency = 1440; // Exactly 24 hours

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('UpdateNotificationPreferenceDto', () => {
  let dto: UpdateNotificationPreferenceDto;

  beforeEach(() => {
    dto = new UpdateNotificationPreferenceDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.enabled = false;
      dto.batched = true;
      dto.batchFrequency = 120;
      dto.quietHoursStart = '23:00';
      dto.quietHoursEnd = '07:00';
      dto.timezone = 'America/New_York';
      dto.settings = { priority: 'low' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid batchFrequency', async () => {
      dto.batchFrequency = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('batchFrequency');
    });

    it('should pass validation with valid boolean values', async () => {
      dto.enabled = true;
      dto.batched = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('BulkUpdateNotificationPreferencesDto', () => {
  let dto: BulkUpdateNotificationPreferencesDto;

  beforeEach(() => {
    dto = new BulkUpdateNotificationPreferencesDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.preferences = [
        {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
          enabled: true,
          batched: false,
          batchFrequency: 60,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'UTC',
          settings: { priority: 'high' },
        },
        {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_COMMENTED,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.PUSH,
          enabled: false,
        },
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when preferences is missing', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferences');
    });

    it('should fail validation when preferences is empty array', async () => {
      dto.preferences = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferences');
    });

    it('should fail validation with invalid preference type', async () => {
      dto.preferences = [
        {
          type: 'invalid_type' as any,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        },
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferences');
    });

    it('should fail validation with invalid preference channel', async () => {
      dto.preferences = [
        {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
          channel: 'invalid_channel' as any,
        },
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferences');
    });

    it('should fail validation with invalid batchFrequency in preferences', async () => {
      dto.preferences = [
        {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
          batchFrequency: 1500, // Too high
        },
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferences');
    });

    it('should pass validation with minimal required fields in preferences', async () => {
      dto.preferences = [
        {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        },
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
