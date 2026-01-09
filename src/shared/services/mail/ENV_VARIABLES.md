# Mail Service Environment Variables

## Provider Selection

```bash
# Choose email provider: 'smtp' (default) or 'resend'
MAIL_PROVIDER=smtp
```

## SMTP Configuration (Default Provider)

```bash
# SMTP Server Settings
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false  # true for port 465, false for other ports

# Authentication
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# Sender Information
MAIL_FROM=noreply@yourdomain.com
MAIL_ADMIN=admin@yourdomain.com
```

## Resend Configuration

```bash
# Provider Selection
MAIL_PROVIDER=resend

# Resend SMTP Settings
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_PORT=465  # Recommended: 465 (secure). Alternatives: 25, 587, 2465, 2587

# Sender Information (must use verified domain)
MAIL_FROM=noreply@yourdomain.com
MAIL_ADMIN=admin@yourdomain.com
```

## Getting Started with Resend

1. Create an account at [resend.com](https://resend.com)
2. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
3. Verify your domain at [resend.com/domains](https://resend.com/domains)
4. Add the environment variables above to your `.env` file
5. Set `MAIL_PROVIDER=resend`
6. Restart your application

## Switching Between Providers

Simply change the `MAIL_PROVIDER` environment variable:

- `MAIL_PROVIDER=smtp` - Use traditional SMTP (Gmail, etc.)
- `MAIL_PROVIDER=resend` - Use Resend service

No code changes required!
