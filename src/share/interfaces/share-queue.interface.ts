/**
 * Share Queue Job Interfaces
 *
 * Defines the structure of jobs sent to RabbitMQ for processing share-related events
 */

export interface ShareCreatedJob {
  jobId: string;
  shareId: string;
  contentType: string;
  contentId: string;
  userId: string;
  channelId?: string;
  campaignId?: string;
  timestamp: string;
}

export interface ShareDeletedJob {
  jobId: string;
  shareId: string;
  contentType: string;
  contentId: string;
  userId: string;
  timestamp: string;
}

export interface ShareCountUpdateJob {
  jobId: string;
  contentType: string;
  contentId: string;
  operation: 'increment' | 'decrement';
  timestamp: string;
}

export interface ShareCountResult {
  jobId: string;
  success: boolean;
  error?: string;
  processingTime: number;
  data?: {
    contentType: string;
    contentId: string;
    shareCount: number;
  };
}
