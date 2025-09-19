import { validate } from 'class-validator';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
} from './create-notification.dto';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('CreateNotificationDto', () => {
  let dto: CreateNotificationDto;

  beforeEach(() => {
    dto = new CreateNotificationDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.priority = NOTIFICATION_CONSTANTS.PRIORITY.NORMAL;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.relatedEntityType = 'article';
      dto.relatedEntityId = '1234567890123456789';
      dto.actionUrl = 'https://example.com/article/123';
      dto.emailTemplate = 'article_liked';
      dto.emailTemplateData = { userName: 'John Doe' };
      dto.pushData = { title: 'New like', body: 'Your article was liked!' };
      dto.metadata = { source: 'web' };
      dto.scheduledFor = '2024-12-31T23:59:59Z';
      dto.maxRetries = 3;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when userId is missing', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userId');
    });

    it('should fail validation when type is missing', async () => {
      dto.userId = '9876543210987654321';
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation when title is missing', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.message = 'John Doe liked your article';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('title');
    });

    it('should fail validation when message is missing', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
    });

    it('should fail validation with invalid type', async () => {
      dto.userId = '9876543210987654321';
      dto.type = 'invalid_type' as any;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation with invalid priority', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.priority = 'invalid_priority' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('priority');
    });

    it('should fail validation with invalid channel', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.channel = 'invalid_channel' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('channel');
    });

    it('should fail validation with invalid actionUrl', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.actionUrl = 'not-a-valid-url';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('actionUrl');
    });

    it('should fail validation with invalid maxRetries (negative)', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.maxRetries = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('maxRetries');
    });

    it('should fail validation with invalid maxRetries (too high)', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';
      dto.maxRetries = 11;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('maxRetries');
    });

    it('should pass validation with optional fields', async () => {
      dto.userId = '9876543210987654321';
      dto.type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      dto.title = 'Your article was liked!';
      dto.message = 'John Doe liked your article';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('CreateBulkNotificationDto', () => {
  let dto: CreateBulkNotificationDto;

  beforeEach(() => {
    dto = new CreateBulkNotificationDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.userIds = ['9876543210987654321', '1111111111111111111'];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';
      dto.priority = NOTIFICATION_CONSTANTS.PRIORITY.HIGH;
      dto.channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      dto.actionUrl = 'https://example.com/maintenance';
      dto.emailTemplate = 'system_announcement';
      dto.emailTemplateData = { maintenanceWindow: '2 hours' };
      dto.metadata = { source: 'admin' };
      dto.scheduledFor = '2024-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when userIds is missing', async () => {
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userIds');
    });

    it('should fail validation when userIds is empty array', async () => {
      dto.userIds = [];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userIds');
    });

    it('should fail validation when userIds contains empty strings', async () => {
      dto.userIds = ['', '9876543210987654321'];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('userIds');
    });

    it('should fail validation when type is missing', async () => {
      dto.userIds = ['9876543210987654321'];
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation when title is missing', async () => {
      dto.userIds = ['9876543210987654321'];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('title');
    });

    it('should fail validation when message is missing', async () => {
      dto.userIds = ['9876543210987654321'];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
    });

    it('should pass validation with minimal required fields', async () => {
      dto.userIds = ['9876543210987654321'];
      dto.type = NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT;
      dto.title = 'System Maintenance';
      dto.message = 'We will perform maintenance';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
