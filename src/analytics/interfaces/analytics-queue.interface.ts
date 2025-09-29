/**
 * Analytics Queue Job Interface
 *
 * Interface for analytics tracking jobs sent to RabbitMQ queue
 */

export interface AnalyticsQueueJob {
  /**
   * Unique job identifier
   */
  jobId: string;

  /**
   * Type of event to track
   */
  eventType: string;

  /**
   * Category of the event
   */
  eventCategory: string;

  /**
   * Type of subject (optional)
   */
  subjectType?: string;

  /**
   * ID of the subject (optional)
   */
  subjectId?: string;

  /**
   * Additional event data
   */
  eventData?: Record<string, any>;

  /**
   * User ID who triggered the event (optional)
   */
  userId?: string;

  /**
   * Session ID for tracking (optional)
   */
  sessionId?: string;

  /**
   * Timestamp when the event was created
   */
  timestamp: string;

  /**
   * Request metadata
   */
  requestMetadata?: {
    method?: string;
    url?: string;
    userAgent?: string;
    ipAddress?: string;
    responseStatus?: number;
  };
}

/**
 * Analytics Queue Job Result
 *
 * Result returned after processing analytics job
 */
export interface AnalyticsQueueJobResult {
  /**
   * Job identifier
   */
  jobId: string;

  /**
   * Whether the job was processed successfully
   */
  success: boolean;

  /**
   * Error message if job failed
   */
  error?: string;

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Additional result data
   */
  data?: {
    eventId?: string;
    metricsUpdated?: boolean;
  };
}
