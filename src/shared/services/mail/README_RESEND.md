# Resend Email Service Integration Guide

This guide explains how to use Resend as your email service provider in this NestJS application.

## Prerequisites

1. **Create a Resend account** at [resend.com](https://resend.com)
2. **Create an API key** at [resend.com/api-keys](https://resend.com/api-keys)
3. **Verify your domain** at [resend.com/domains](https://resend.com/domains)

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Mail Provider Selection
MAIL_PROVIDER=resend  # Options: 'smtp' or 'resend'

# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_PORT=465  # Recommended: 465 (secure). Alternatives: 25, 587, 2465, 2587

# Sender Information (required)
MAIL_FROM=noreply@yourdomain.com
```

### Switching Between Providers

To switch back to SMTP (e.g., Gmail):

```bash
MAIL_PROVIDER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

## Usage

### Basic Email Sending

```typescript
import { MailService } from './shared/services/mail/mail.service';

// Inject MailService
constructor(private readonly mailService: MailService) {}

// Send a basic email
await this.mailService.sendMail({
  to: 'recipient@example.com',
  subject: 'Hello from Resend',
  html: '<h1>Welcome!</h1><p>This email was sent via Resend.</p>',
  text: 'Welcome! This email was sent via Resend.',
});
```

### Using Resend-Specific Features

#### 1. Idempotency Key (Prevent Duplicate Sends)

```typescript
await this.mailService.sendMail({
  to: 'user@example.com',
  subject: 'Welcome Email',
  html: '<h1>Welcome!</h1>',
  resendOptions: {
    idempotencyKey: `welcome-user-${userId}`,
  },
});
```

If you send the same email with the same idempotency key within 24 hours, Resend will not send a duplicate.

#### 2. Prevent Gmail Threading

```typescript
await this.mailService.sendMail({
  to: 'user@example.com',
  subject: 'Daily Notification',
  html: '<p>Your daily update</p>',
  resendOptions: {
    preventThreading: true, // Adds X-Entity-Ref-ID header
  },
});
```

This prevents Gmail from grouping emails into conversation threads.

#### 3. Unsubscribe Link

```typescript
await this.mailService.sendMail({
  to: 'user@example.com',
  subject: 'Newsletter',
  html: '<p>Your newsletter content</p>',
  resendOptions: {
    unsubscribeUrl: 'https://yourdomain.com/unsubscribe?token=xxx',
  },
});
```

This adds a `List-Unsubscribe` header that email clients can use to show an unsubscribe button.

#### 4. Combining Multiple Features

```typescript
await this.mailService.sendMail({
  to: 'user@example.com',
  subject: 'Order Confirmation',
  html: '<h1>Order #12345</h1>',
  resendOptions: {
    idempotencyKey: `order-confirmation-12345`,
    preventThreading: true,
    unsubscribeUrl: 'https://yourdomain.com/unsubscribe',
  },
});
```

### Using Templates

```typescript
await this.mailService.sendTemplateMail(
  'welcome', // template name
  'user@example.com', // recipient
  { userName: 'John Doe' }, // template data
  {
    resendOptions: {
      idempotencyKey: `welcome-${userId}`,
    },
  },
);
```

## Monitoring

### Check Sent Emails

View all emails sent via Resend in the [Resend Dashboard](https://resend.com/emails).

### Application Logs

The mail service logs provider information:

```
🔧 Initializing mail transporter with provider: resend
✅ Mail transporter verified successfully (resend)
📧 Email sent successfully: <message-id>
```

### Get Metrics

```typescript
const metrics = this.mailService.getMetrics();
console.log(metrics);
// {
//   totalSent: 100,
//   totalFailed: 2,
//   successRate: 0.98,
//   averageResponseTime: 250,
//   lastSent: Date,
//   lastFailed: Date
// }
```

## Troubleshooting

### Common Issues

**1. "Mail transporter not initialized"**

- Ensure `RESEND_API_KEY` is set in your environment variables
- Check that the API key is valid

**2. "Authentication failed"**

- Verify your API key at [resend.com/api-keys](https://resend.com/api-keys)
- Ensure the API key starts with `re_`

**3. "Domain not verified"**

- Verify your domain at [resend.com/domains](https://resend.com/domains)
- Ensure `MAIL_FROM` uses a verified domain

**4. Rate limit exceeded**

- Resend has the same rate limits as their API
- Check your plan limits at [resend.com/docs/api-reference/introduction#rate-limit](https://resend.com/docs/api-reference/introduction#rate-limit)

### Testing Connection

```typescript
const isConnected = await this.mailService.testConnection();
console.log('Mail service connected:', isConnected);
```

## Migration from SMTP

1. **Keep existing configuration** - Your SMTP settings remain unchanged
2. **Add Resend variables** - Add `MAIL_PROVIDER=resend` and `RESEND_API_KEY`
3. **Test in development** - Verify emails are sent correctly
4. **Switch provider** - Change `MAIL_PROVIDER` to `resend`
5. **Monitor** - Check Resend dashboard for delivery status

## Best Practices

1. **Use idempotency keys** for critical emails (confirmations, receipts)
2. **Enable threading prevention** for transactional emails
3. **Add unsubscribe URLs** for marketing emails
4. **Monitor the dashboard** regularly for delivery issues
5. **Keep SMTP as fallback** - You can switch back anytime by changing `MAIL_PROVIDER`

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Resend Dashboard](https://resend.com/emails)
- [Resend Support](https://resend.com/help)
