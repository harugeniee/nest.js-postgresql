# Mail Queue Implementation

## Overview
Tính năng gửi email thông qua queue sử dụng RabbitMQ để xử lý email bất đồng bộ, giúp cải thiện performance và reliability của hệ thống.

## Architecture

### Components

1. **MailQueueService** - Gửi mail jobs đến RabbitMQ
2. **MailQueueIntegrationService** - Service tích hợp cho cả direct và queue-based sending
3. **WorkerController** - Xử lý mail jobs từ RabbitMQ
4. **WorkerService** - Logic xử lý mail jobs
5. **MailerEmailOtpSender** - OTP sender sử dụng queue

### Flow

```
Client Request → MailQueueService → RabbitMQ → WorkerController → WorkerService → MailService → Email Sent
```

## Configuration

### Environment Variables

```env
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=mail_queue

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
```

### Queue Configuration

```typescript
const mailQueueConfig = {
  defaultPriority: 5,        // 1-10, higher = more priority
  defaultMaxAttempts: 3,     // Max retry attempts
  retryDelay: 5000,          // 5 seconds delay between retries
  batchSize: 10,             // Batch processing size
  processingTimeout: 30000,  // 30 seconds timeout
};
```

## Usage

### 1. Single Email via Queue

```typescript
import { MailQueueIntegrationService } from 'src/shared/services/mail/mail-queue-integration.service';

@Injectable()
export class YourService {
  constructor(
    private readonly mailQueueIntegration: MailQueueIntegrationService,
  ) {}

  async sendWelcomeEmail(userEmail: string) {
    const result = await this.mailQueueIntegration.sendMailQueue({
      to: userEmail,
      subject: 'Welcome!',
      html: '<h1>Welcome to our service!</h1>',
    }, 7); // Priority 7

    console.log(`Email queued: ${result.jobId}`);
  }
}
```

### 2. Batch Email via Queue

```typescript
async sendNewsletter(recipients: MailAddress[]) {
  const result = await this.mailQueueIntegration.sendMailBatchQueue(
    {
      subject: 'Weekly Newsletter',
      html: '<h1>Newsletter Content</h1>',
    },
    recipients,
    5, // Priority 5
  );

  console.log(`Newsletter queued: ${result.jobId}`);
}
```

### 3. Template Email via Queue

```typescript
async sendPasswordResetEmail(userEmail: string, resetToken: string) {
  const result = await this.mailQueueIntegration.sendTemplateMailQueue(
    'password-reset',
    { email: userEmail },
    {
      resetLink: `https://app.com/reset?token=${resetToken}`,
      expirationTime: 24,
    },
    { priority: 'high' },
    8, // High priority
  );

  console.log(`Password reset email queued: ${result.jobId}`);
}
```

### 4. OTP Email via Queue (Automatic)

OTP emails tự động sử dụng queue khi gọi `AuthService.requestOtp()`:

```typescript
// OTP request automatically uses queue
const result = await authService.requestOtp({ email: 'user@example.com' });
// Email sẽ được gửi qua queue với priority cao
```

## Job Types

### 1. SingleEmailQueueJob
- Gửi 1 email đơn lẻ
- Job name: `mail_single`

### 2. BatchEmailQueueJob
- Gửi email hàng loạt
- Job name: `mail_batch`

### 3. TemplateEmailQueueJob
- Gửi email sử dụng template
- Job name: `mail_template`

### 4. OtpEmailQueueJob
- Gửi OTP email (priority cao)
- Job name: `mail_otp`

## Error Handling

### Retry Logic
- Mặc định: 3 lần retry
- Delay: 5 giây giữa các lần retry
- Nếu vượt quá max attempts, job sẽ bị reject

### Dead Letter Queue
- Jobs thất bại sẽ được chuyển đến dead letter queue
- Có thể monitor và xử lý manual

## Monitoring

### Logs
```typescript
// Worker logs
[WorkerService] Processing single email job: mail_1234567890_abc123
[WorkerService] Single email job completed: mail_1234567890_abc123, success: true

// Queue logs
[MailQueueService] Sending single email job: mail_1234567890_abc123
[MailQueueService] Single email queued successfully: mail_1234567890_abc123
```

### Metrics
```typescript
// Get mail metrics
const metrics = await mailQueueIntegration.getMetrics();
console.log(`Total sent: ${metrics.totalSent}`);
console.log(`Success rate: ${metrics.successRate}`);
```

## Performance Benefits

1. **Non-blocking**: Email sending không block main thread
2. **Scalable**: Có thể scale worker instances
3. **Reliable**: Retry mechanism và error handling
4. **Prioritized**: OTP emails có priority cao hơn
5. **Batched**: Batch processing cho hiệu quả cao

## Fallback to Direct Sending

Nếu queue không available, có thể fallback về direct sending:

```typescript
// Direct sending (synchronous)
const result = await mailQueueIntegration.sendMailDirect(mailOptions);
```

## Testing

### Unit Tests
```typescript
describe('MailQueueIntegrationService', () => {
  it('should queue single email', async () => {
    const result = await service.sendMailQueue({
      to: 'test@example.com',
      subject: 'Test',
      html: '<h1>Test</h1>',
    });
    
    expect(result.jobId).toBeDefined();
    expect(result.message).toContain('queued');
  });
});
```

### Integration Tests
```typescript
describe('OTP Email Queue', () => {
  it('should queue OTP email', async () => {
    const result = await authService.requestOtp({
      email: 'user@example.com',
    });
    
    expect(result.data.requestId).toBeDefined();
    // Email sẽ được xử lý bởi worker
  });
});
```

## Troubleshooting

### Common Issues

1. **RabbitMQ Connection Failed**
   - Check RABBITMQ_URL environment variable
   - Ensure RabbitMQ server is running

2. **Email Not Sent**
   - Check worker logs for errors
   - Verify mail configuration
   - Check queue status

3. **High Memory Usage**
   - Reduce batch size
   - Increase worker instances
   - Monitor queue length

### Debug Commands

```bash
# Check RabbitMQ status
docker exec rabbitmq rabbitmqctl status

# List queues
docker exec rabbitmq rabbitmqctl list_queues

# Check queue messages
docker exec rabbitmq rabbitmqctl list_queues name messages
```

## Migration from Direct to Queue

### Before (Direct Sending)
```typescript
const result = await mailService.sendTemplateMail('welcome', recipients, data);
```

### After (Queue Sending)
```typescript
const result = await mailQueueIntegration.sendTemplateMailQueue('welcome', recipients, data);
```

### Gradual Migration
1. Deploy queue infrastructure
2. Update services to use queue methods
3. Monitor performance and errors
4. Remove direct sending methods (optional)
