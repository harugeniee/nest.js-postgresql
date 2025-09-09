/**
 * Mail service interfaces and types
 */

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string; // Content ID for embedded images
  encoding?: string;
  path?: string; // File path instead of content
}

export interface MailAddress {
  name?: string;
  email: string;
}

type MailAddressOrArray = MailAddress | MailAddress[];

export interface MailRecipient {
  to: MailAddressOrArray;
  cc?: MailAddressOrArray;
  bcc?: MailAddressOrArray;
  replyTo?: MailAddress;
}

export interface MailContent {
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

type MailAddressOrString = MailAddress | string;
type MailAddressOrArrayOrString = MailAddress | MailAddress[] | string;

export interface MailOptions {
  from?: MailAddressOrString;
  to: MailAddressOrArrayOrString;
  cc?: MailAddressOrArrayOrString;
  bcc?: MailAddressOrArrayOrString;
  replyTo?: MailAddressOrString;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  encoding?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string | string[];
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  response?: string;
}

export interface MailSendBatchResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: MailSendResult[];
  errors: string[];
}

export interface MailTemplate {
  name: string;
  subject: string;
  text?: string;
  html: string;
  variables?: string[];
  category?: string;
  isActive?: boolean;
}

export interface MailQueueJob {
  id: string;
  options: MailOptions;
  priority?: number;
  delay?: number;
  attempts?: number;
  maxAttempts?: number;
  createdAt: Date;
  scheduledFor?: Date;
}

export interface MailQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface MailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  admin: string;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  rateDelta?: number;
  rateLimit?: number;
  tls?: {
    rejectUnauthorized: boolean;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

export interface MailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MailRateLimit {
  limit: number;
  window: number; // in milliseconds
  current: number;
  remaining: number;
  resetTime: number;
}

export interface MailMetrics {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  averageResponseTime: number;
  lastSent?: Date;
  lastFailed?: Date;
}

export type MailPriority = 'high' | 'normal' | 'low';

export type MailEncoding =
  | 'utf8'
  | 'ascii'
  | 'latin1'
  | 'base64'
  | 'quoted-printable';

export type MailTemplateEngine = 'handlebars' | 'ejs' | 'pug' | 'mustache';

export interface MailTemplateEngineConfig {
  engine: MailTemplateEngine;
  options: Record<string, unknown>;
}

export interface MailProvider {
  name: string;
  type: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'mandrill';
  config: Record<string, unknown>;
  isActive: boolean;
  priority: number;
}

export interface MailProviderResult {
  provider: string;
  success: boolean;
  messageId?: string;
  error?: string;
  responseTime: number;
}
