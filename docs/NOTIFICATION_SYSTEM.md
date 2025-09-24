# 🔔 Notification System Documentation

## 📋 Overview

The Notification System is a comprehensive, multi-channel notification platform that handles user notifications across email, push, and in-app channels. It provides real-time notifications, user preferences, and advanced notification management capabilities.

## 🎯 Key Features

### **Multi-channel Notifications**
- **Email Notifications**: HTML email notifications with templates
- **Push Notifications**: Mobile push notifications via FCM
- **In-app Notifications**: Real-time in-app notifications
- **WebSocket Updates**: Live notification delivery

### **User Preferences**
- **Granular Control**: Per-channel notification preferences
- **Notification Types**: Customize by notification type
- **Quiet Hours**: Set quiet hours for notifications
- **Batch Notifications**: Digest notifications for less important updates

### **Advanced Features**
- **Notification Templates**: Reusable notification templates
- **Scheduled Notifications**: Time-based notification delivery
- **Broadcast Notifications**: System-wide announcements
- **Notification Analytics**: Comprehensive notification metrics

## 🏗️ Architecture

### **Core Components**

```
notifications/
├── entities/
│   ├── notification.entity.ts           # Notification entity
│   ├── notification-preference.entity.ts # User preferences
│   ├── broadcast-notification.entity.ts  # Broadcast notifications
│   ├── notification-template.entity.ts   # Notification templates
│   ├── notification-log.entity.ts        # Notification logs
│   ├── notification-channel.entity.ts    # Notification channels
│   └── notification-schedule.entity.ts   # Scheduled notifications
├── dto/
│   ├── create-notification.dto.ts       # Notification creation DTO
│   ├── notification-query.dto.ts        # Notification query DTO
│   ├── notification-preference.dto.ts   # Preference management DTO
│   ├── broadcast-notification.dto.ts    # Broadcast DTO
│   ├── notification-stats.dto.ts        # Notification statistics DTO
│   ├── notification-template.dto.ts     # Template management DTO
│   └── notification-schedule.dto.ts     # Scheduling DTO
├── services/
│   ├── notification-preference.service.ts # Preference management
│   └── broadcast-notification.service.ts  # Broadcast notifications
├── controllers/
│   ├── notifications.controller.ts      # Notification API endpoints
│   └── broadcast-notification.controller.ts # Broadcast API endpoints
└── notifications.module.ts              # Notification module
```

### **Data Structure**

#### **Notification Entity**
```typescript
@Entity('notifications')
export class Notification extends BaseEntityCustom {
  @PrimaryColumn('bigint')
  id!: string;

  @Column('bigint')
  userId!: string;

  @Column('varchar', { length: 100 })
  type!: string; // 'like', 'comment', 'follow', 'mention', etc.

  @Column('varchar', { length: 200 })
  title!: string;

  @Column('text')
  message!: string;

  @Column('jsonb', { nullable: true })
  data?: Record<string, any>; // Additional notification data

  @Column('boolean', { default: false })
  isRead!: boolean;

  @Column('timestamp', { nullable: true })
  readAt?: Date;

  @Column('varchar', { length: 50, default: 'pending' })
  status!: string; // 'pending', 'sent', 'failed', 'delivered'

  @Column('jsonb', { nullable: true })
  channels?: string[]; // ['email', 'push', 'in_app']

  @Column('timestamp', { nullable: true })
  scheduledAt?: Date;
}
```

#### **Notification Preference Entity**
```typescript
@Entity('notification_preferences')
export class NotificationPreference extends BaseEntityCustom {
  @PrimaryColumn('bigint')
  userId!: string;

  @Column('varchar', { length: 100 })
  type!: string;

  @Column('boolean', { default: true })
  emailEnabled!: boolean;

  @Column('boolean', { default: true })
  pushEnabled!: boolean;

  @Column('boolean', { default: true })
  inAppEnabled!: boolean;

  @Column('jsonb', { nullable: true })
  quietHours?: {
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };

  @Column('boolean', { default: false })
  digestEnabled!: boolean;

  @Column('varchar', { length: 20, default: 'daily' })
  digestFrequency!: string; // 'daily', 'weekly', 'monthly'
}
```

## 🚀 Core Services

### **NotificationsService**

#### **Notification Creation**
```typescript
// Create a single notification
async createNotification(notification: CreateNotificationDto): Promise<Notification>

// Create multiple notifications
async createNotifications(notifications: CreateNotificationDto[]): Promise<Notification[]>

// Create notification for specific users
async createNotificationForUsers(userIds: string[], notification: CreateNotificationDto): Promise<Notification[]>
```

#### **Notification Management**
```typescript
// Get user notifications
async getUserNotifications(userId: string, query: NotificationQueryDto): Promise<PaginatedResult<Notification>>

// Mark notification as read
async markAsRead(notificationId: string, userId: string): Promise<void>

// Mark all notifications as read
async markAllAsRead(userId: string): Promise<void>

// Delete notification
async deleteNotification(notificationId: string, userId: string): Promise<void>

// Get unread count
async getUnreadCount(userId: string): Promise<number>
```

#### **Notification Delivery**
```typescript
// Send notification via all channels
async sendNotification(notification: Notification): Promise<void>

// Send via specific channel
async sendViaChannel(notification: Notification, channel: string): Promise<void>

// Retry failed notifications
async retryFailedNotifications(): Promise<void>

// Process notification queue
async processNotificationQueue(): Promise<void>
```

### **NotificationPreferenceService**

#### **Preference Management**
```typescript
// Get user preferences
async getUserPreferences(userId: string): Promise<NotificationPreference[]>

// Update preference
async updatePreference(userId: string, type: string, preference: UpdatePreferenceDto): Promise<void>

// Bulk update preferences
async updatePreferences(userId: string, preferences: UpdatePreferencesDto): Promise<void>

// Reset to defaults
async resetToDefaults(userId: string): Promise<void>
```

#### **Preference Validation**
```typescript
// Check if user wants this notification type
async shouldSendNotification(userId: string, type: string, channel: string): Promise<boolean>

// Check quiet hours
async isInQuietHours(userId: string): Promise<boolean>

// Get user's preferred channels for type
async getPreferredChannels(userId: string, type: string): Promise<string[]>
```

### **BroadcastNotificationService**

#### **Broadcast Management**
```typescript
// Create broadcast notification
async createBroadcast(broadcast: CreateBroadcastDto): Promise<BroadcastNotification>

// Send broadcast to all users
async sendBroadcastToAll(broadcastId: string): Promise<void>

// Send broadcast to specific users
async sendBroadcastToUsers(broadcastId: string, userIds: string[]): Promise<void>

// Schedule broadcast
async scheduleBroadcast(broadcastId: string, scheduledAt: Date): Promise<void>
```

#### **Broadcast Analytics**
```typescript
// Get broadcast statistics
async getBroadcastStats(broadcastId: string): Promise<BroadcastStats>

// Get delivery status
async getDeliveryStatus(broadcastId: string): Promise<DeliveryStatus[]>

// Get engagement metrics
async getEngagementMetrics(broadcastId: string): Promise<EngagementMetrics>
```

## 🔧 Notification Channels

### **Email Channel**

#### **Email Service Integration**
```typescript
// Send email notification
async sendEmailNotification(notification: Notification): Promise<void> {
  const template = await this.getEmailTemplate(notification.type);
  const html = this.renderTemplate(template, notification);
  
  await this.mailService.sendMail({
    to: notification.user.email,
    subject: notification.title,
    html: html,
    template: template.name
  });
}
```

#### **Email Templates**
```typescript
// Template structure
interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

// Available templates
const templates = {
  'like': 'notification-like.html',
  'comment': 'notification-comment.html',
  'follow': 'notification-follow.html',
  'mention': 'notification-mention.html',
  'article_published': 'notification-article.html'
};
```

### **Push Channel**

#### **FCM Integration**
```typescript
// Send push notification
async sendPushNotification(notification: Notification): Promise<void> {
  const deviceTokens = await this.getUserDeviceTokens(notification.userId);
  
  if (deviceTokens.length === 0) return;

  const message = {
    notification: {
      title: notification.title,
      body: notification.message
    },
    data: {
      type: notification.type,
      id: notification.id,
      ...notification.data
    },
    tokens: deviceTokens
  };

  await this.fcmService.sendMulticast(message);
}
```

#### **Push Notification Types**
```typescript
// Push notification payload
interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  click_action?: string;
}
```

### **In-app Channel**

#### **WebSocket Integration**
```typescript
// Send in-app notification
async sendInAppNotification(notification: Notification): Promise<void> {
  // Save to database
  await this.notificationRepository.save(notification);
  
  // Send via WebSocket
  this.gateway.sendToUser(notification.userId, 'notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    createdAt: notification.createdAt
  });
}
```

#### **Real-time Updates**
```typescript
// WebSocket events
@WebSocketGateway()
export class NotificationGateway {
  @SubscribeMessage('join_notifications')
  handleJoinNotifications(client: Socket, userId: string) {
    client.join(`user_${userId}`);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, notificationId: string) {
    await this.notificationsService.markAsRead(notificationId, client.userId);
    client.emit('notification_read', { id: notificationId });
  }
}
```

## 📊 Notification Types

### **Content Notifications**
- **Article Published**: New article from followed users
- **Article Liked**: Someone liked your article
- **Article Commented**: New comment on your article
- **Article Bookmarked**: Someone bookmarked your article

### **Social Notifications**
- **User Followed**: Someone followed you
- **User Unfollowed**: Someone unfollowed you
- **Mention**: Someone mentioned you in a comment
- **Comment Reply**: Reply to your comment

### **System Notifications**
- **Account Updates**: Password changed, email verified
- **Security Alerts**: Login from new device
- **System Maintenance**: Scheduled maintenance notifications
- **Feature Updates**: New feature announcements

### **Broadcast Notifications**
- **System Announcements**: Important system updates
- **Maintenance Notices**: Scheduled maintenance
- **Feature Launches**: New feature announcements
- **Emergency Alerts**: Critical system alerts

## 🔄 Background Processing

### **Notification Queue**

#### **RabbitMQ Integration**
```typescript
// Queue notification for processing
async queueNotification(notification: Notification): Promise<void> {
  await this.rabbitmqService.publish('notification_queue', {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    channels: notification.channels,
    data: notification.data
  });
}
```

#### **Worker Processing**
```typescript
// Process notification from queue
@RabbitSubscribe('notification_queue')
async handleNotification(data: NotificationQueueData): Promise<void> {
  const notification = await this.notificationRepository.findOne(data.id);
  if (!notification) return;

  // Check user preferences
  const shouldSend = await this.preferenceService.shouldSendNotification(
    notification.userId,
    notification.type,
    'email'
  );

  if (shouldSend) {
    await this.sendEmailNotification(notification);
  }
}
```

### **Scheduled Notifications**

#### **Cron Jobs**
```typescript
// Process scheduled notifications
@Cron('*/5 * * * *') // Every 5 minutes
async processScheduledNotifications(): Promise<void> {
  const scheduled = await this.getScheduledNotifications();
  
  for (const notification of scheduled) {
    if (notification.scheduledAt <= new Date()) {
      await this.sendNotification(notification);
      await this.markAsSent(notification.id);
    }
  }
}
```

#### **Digest Notifications**
```typescript
// Send daily digest
@Cron('0 9 * * *') // Daily at 9 AM
async sendDailyDigest(): Promise<void> {
  const users = await this.getUsersWithDigestEnabled('daily');
  
  for (const user of users) {
    const notifications = await this.getUnreadNotifications(user.id, 24); // Last 24 hours
    if (notifications.length > 0) {
      await this.sendDigestEmail(user, notifications);
    }
  }
}
```

## 📈 Analytics & Monitoring

### **Notification Analytics**
```typescript
// Get notification statistics
async getNotificationStats(timeRange: string): Promise<NotificationStats> {
  return {
    totalSent: await this.getTotalSent(timeRange),
    totalDelivered: await this.getTotalDelivered(timeRange),
    totalRead: await this.getTotalRead(timeRange),
    deliveryRate: await this.getDeliveryRate(timeRange),
    readRate: await this.getReadRate(timeRange),
    channelBreakdown: await this.getChannelBreakdown(timeRange)
  };
}
```

### **User Engagement Metrics**
```typescript
// Get user engagement
async getUserEngagement(userId: string): Promise<UserEngagement> {
  return {
    totalNotifications: await this.getUserNotificationCount(userId),
    readRate: await this.getUserReadRate(userId),
    preferredChannels: await this.getUserPreferredChannels(userId),
    engagementScore: await this.calculateEngagementScore(userId)
  };
}
```

### **System Monitoring**
- **Queue Length**: Monitor notification queue size
- **Processing Time**: Track notification processing time
- **Error Rates**: Monitor failed notification delivery
- **Channel Performance**: Track performance by channel
- **User Preferences**: Monitor preference changes

## 🔒 Security & Privacy

### **Data Protection**
- **Encryption**: Encrypt sensitive notification data
- **Access Control**: Role-based access to notifications
- **Audit Logging**: Log all notification operations
- **Data Retention**: Configurable notification retention

### **Privacy Controls**
- **User Preferences**: Full control over notification types
- **Opt-out Options**: Easy unsubscribe mechanisms
- **Data Minimization**: Only collect necessary data
- **Consent Management**: Clear consent for notifications

## 🚀 API Endpoints

### **Notification Management**
```typescript
// Get user notifications
GET /api/notifications
Authorization: Bearer <token>
Query: ?limit=20&offset=0&type=like&unread_only=true

// Mark notification as read
PUT /api/notifications/:id/read
Authorization: Bearer <token>

// Mark all as read
PUT /api/notifications/read-all
Authorization: Bearer <token>

// Delete notification
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### **Preference Management**
```typescript
// Get user preferences
GET /api/notifications/preferences
Authorization: Bearer <token>

// Update preference
PUT /api/notifications/preferences/:type
Authorization: Bearer <token>
Body: { emailEnabled: true, pushEnabled: false }

// Reset preferences
POST /api/notifications/preferences/reset
Authorization: Bearer <token>
```

### **Broadcast Management**
```typescript
// Create broadcast
POST /api/admin/notifications/broadcast
Authorization: Bearer <admin_token>
Body: { title: "System Update", message: "New features available" }

// Get broadcast stats
GET /api/admin/notifications/broadcast/:id/stats
Authorization: Bearer <admin_token>
```

## 🧪 Testing

### **Unit Tests**
```typescript
describe('NotificationsService', () => {
  it('should create notification', async () => {
    const notification = await service.createNotification({
      userId: 'user1',
      type: 'like',
      title: 'New Like',
      message: 'Someone liked your article'
    });

    expect(notification).toBeDefined();
    expect(notification.type).toBe('like');
  });

  it('should respect user preferences', async () => {
    await preferenceService.updatePreference('user1', 'like', {
      emailEnabled: false
    });

    const shouldSend = await preferenceService.shouldSendNotification(
      'user1', 'like', 'email'
    );

    expect(shouldSend).toBe(false);
  });
});
```

### **Integration Tests**
```typescript
describe('Notification Delivery', () => {
  it('should send email notification', async () => {
    const notification = await createTestNotification();
    await service.sendEmailNotification(notification);
    
    expect(mockMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: notification.user.email,
        subject: notification.title
      })
    );
  });
});
```

## 🎯 Future Enhancements

### **Planned Features**
- **Smart Notifications**: AI-powered notification timing
- **Rich Notifications**: Rich media in notifications
- **Notification Groups**: Group related notifications
- **Advanced Analytics**: ML-based notification analytics

### **Technical Improvements**
- **Real-time Processing**: Stream processing for notifications
- **Advanced Caching**: Enhanced caching strategies
- **Microservices**: Split into notification microservice
- **Event Sourcing**: Event-driven notification architecture

---

**The Notification System provides a comprehensive, scalable solution for user notifications across multiple channels with advanced features and excellent performance.**
