// Media Entity Constants - Enhanced version of file constants
export const MEDIA_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  PATH_MAX_LENGTH: 500,
  MIME_TYPE_MAX_LENGTH: 100,
  EXTENSION_MAX_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 200,
  ALT_TEXT_MAX_LENGTH: 500,

  // File size limits (in bytes)
  SIZE_LIMITS: {
    SMALL: 1024 * 1024, // 1MB
    MEDIUM: 10 * 1024 * 1024, // 10MB
    LARGE: 100 * 1024 * 1024, // 100MB
    MAX: 500 * 1024 * 1024, // 500MB
  },

  // Status values - Enhanced with more states
  STATUS: {
    INACTIVE: 'inactive',
    ACTIVE: 'active',
    PROCESSING: 'processing',
    FAILED: 'failed',
    DELETED: 'deleted',
    ARCHIVED: 'archived',
  },

  // Media types - More comprehensive
  TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    ARCHIVE: 'archive',
    PRESENTATION: 'presentation',
    SPREADSHEET: 'spreadsheet',
    OTHER: 'other',
  },

  // Allowed MIME types - Expanded
  ALLOWED_MIME_TYPES: {
    IMAGE: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
    ],
    VIDEO: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/3gp',
    ],
    AUDIO: [
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac',
      'audio/flac',
    ],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf',
    ],
    PRESENTATION: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    SPREADSHEET: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    ARCHIVE: [
      'application/zip',
      'application/rar',
      'application/7z',
      'application/x-tar',
      'application/gzip',
    ],
  },

  // Quality settings for different media types
  QUALITY_SETTINGS: {
    IMAGE: {
      THUMBNAIL: { width: 150, height: 150 },
      SMALL: { width: 400, height: 400 },
      MEDIUM: { width: 800, height: 600 },
      LARGE: { width: 1200, height: 900 },
    },
    VIDEO: {
      THUMBNAIL: { width: 320, height: 240 },
      PREVIEW: { width: 640, height: 480 },
      HD: { width: 1280, height: 720 },
      FULL_HD: { width: 1920, height: 1080 },
    },
  },

  // Storage configurations
  STORAGE: {
    LOCAL: 'local',
    AWS_S3: 'aws_s3',
    GOOGLE_CLOUD: 'google_cloud',
    AZURE_BLOB: 'azure_blob',
  },

  // Message codes for error handling
  MESSAGE_CODE: {
    MEDIA_IS_REQUIRED: 'MEDIA_IS_REQUIRED',
    MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',
    MEDIA_TYPE_NOT_SUPPORTED: 'MEDIA_TYPE_NOT_SUPPORTED',
    MEDIA_SIZE_EXCEEDED: 'MEDIA_SIZE_EXCEEDED',
    MEDIA_UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
    MEDIA_DELETE_FAILED: 'MEDIA_DELETE_FAILED',
    MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
  },
} as const;

// Type definitions for better TypeScript support
export type MediaStatus =
  (typeof MEDIA_CONSTANTS.STATUS)[keyof typeof MEDIA_CONSTANTS.STATUS];
export type MediaType =
  (typeof MEDIA_CONSTANTS.TYPES)[keyof typeof MEDIA_CONSTANTS.TYPES];
export type MediaSizeLimit =
  (typeof MEDIA_CONSTANTS.SIZE_LIMITS)[keyof typeof MEDIA_CONSTANTS.SIZE_LIMITS];
export type MediaStorage =
  (typeof MEDIA_CONSTANTS.STORAGE)[keyof typeof MEDIA_CONSTANTS.STORAGE];
