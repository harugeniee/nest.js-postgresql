/**
 * Mail configuration factory
 * Provides mail service configuration based on environment variables
 * Supports multiple providers: 'smtp' (default) and 'resend'
 */
export const mailConfig = () => {
  const provider = (process.env.MAIL_PROVIDER || 'smtp') as 'smtp' | 'resend';

  // Base configuration shared by all providers
  const baseConfig = {
    provider,
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    admin: process.env.MAIL_ADMIN || process.env.MAIL_FROM,
    // Connection pooling
    pool: true, // use pooled connections
    maxConnections: 5, // max connections in pool
    maxMessages: 100, // max messages per connection
    rateDelta: 20000, // rate limiting
    rateLimit: 5, // max messages per rateDelta
    // Connection timeout
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  };

  // Provider-specific configuration
  if (provider === 'resend') {
    return {
      ...baseConfig,
      host: 'smtp.resend.com',
      port: Number(process.env.RESEND_PORT) || 465,
      secure: true, // Required for Resend
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
  }

  // Default SMTP configuration
  return {
    ...baseConfig,
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  };
};

/**
 * Mail validation configuration
 */
export const mailValidationConfig = {
  // Email validation regex - ReDoS safe pattern
  // This pattern uses a simple, non-backtracking approach to avoid ReDoS attacks
  emailRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  // Max recipients per email
  maxRecipients: 100,
  // Max subject length
  maxSubjectLength: 200,
  // Max content length
  maxContentLength: 1000000, // 1MB
  // Allowed file types for attachments
  allowedAttachmentTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  // Max attachment size (in bytes)
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
};
