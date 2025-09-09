/**
 * Mail Queue Interfaces
 * Defines data structures for mail queue jobs and processing
 */

import { MailAddress, MailOptions } from './mail.interface';

/**
 * Mail queue job types
 */
export enum MailQueueJobType {
  SINGLE_EMAIL = 'single_email',
  BATCH_EMAIL = 'batch_email',
  TEMPLATE_EMAIL = 'template_email',
  OTP_EMAIL = 'otp_email',
}

/**
 * Base interface for all mail queue jobs
 */
export interface BaseMailQueueJob {
  /** Unique job ID */
  jobId: string;
  /** Job type */
  type: MailQueueJobType;
  /** Job priority (1-10, higher number = higher priority) */
  priority: number;
  /** Job creation timestamp */
  createdAt: number;
  /** Job processing attempts */
  attempts: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Job delay in milliseconds */
  delay?: number;
  /** Job metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Single email queue job
 */
export interface SingleEmailQueueJob extends BaseMailQueueJob {
  type: MailQueueJobType.SINGLE_EMAIL;
  /** Mail options for single email */
  mailOptions: MailOptions;
}

/**
 * Batch email queue job
 */
export interface BatchEmailQueueJob extends BaseMailQueueJob {
  type: MailQueueJobType.BATCH_EMAIL;
  /** Mail options (without recipients) */
  mailOptions: Omit<MailOptions, 'to'>;
  /** List of recipients */
  recipients: MailAddress[];
}

/**
 * Template email queue job
 */
export interface TemplateEmailQueueJob extends BaseMailQueueJob {
  type: MailQueueJobType.TEMPLATE_EMAIL;
  /** Template name */
  templateName: string;
  /** Recipients */
  recipients: MailAddress | MailAddress[];
  /** Template data */
  templateData: Record<string, unknown>;
  /** Additional mail options */
  options?: Partial<MailOptions>;
}

/**
 * OTP email queue job
 */
export interface OtpEmailQueueJob extends BaseMailQueueJob {
  type: MailQueueJobType.OTP_EMAIL;
  /** Recipient email */
  email: string;
  /** OTP code */
  otpCode: string;
  /** Request ID */
  requestId: string;
  /** Additional template data */
  templateData?: Record<string, unknown>;
}

/**
 * Union type for all mail queue jobs
 */
export type MailQueueJob =
  | SingleEmailQueueJob
  | BatchEmailQueueJob
  | TemplateEmailQueueJob
  | OtpEmailQueueJob;

/**
 * Mail queue job result
 */
export interface MailQueueJobResult {
  /** Job ID */
  jobId: string;
  /** Whether job was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Result data */
  data?: unknown;
}

/**
 * Mail queue statistics
 */
export interface MailQueueStats {
  /** Total jobs processed */
  totalProcessed: number;
  /** Successful jobs */
  successful: number;
  /** Failed jobs */
  failed: number;
  /** Currently processing jobs */
  processing: number;
  /** Average processing time in milliseconds */
  averageProcessingTime: number;
  /** Jobs by type */
  jobsByType: Record<MailQueueJobType, number>;
}

/**
 * Mail queue configuration
 */
export interface MailQueueConfig {
  /** Default job priority */
  defaultPriority: number;
  /** Default max attempts */
  defaultMaxAttempts: number;
  /** Job retry delay in milliseconds */
  retryDelay: number;
  /** Batch size for processing */
  batchSize: number;
  /** Processing timeout in milliseconds */
  processingTimeout: number;
}
