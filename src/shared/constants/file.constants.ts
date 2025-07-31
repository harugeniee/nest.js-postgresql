// File Entity Constants
export const FILE_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  PATH_MAX_LENGTH: 500,
  MIME_TYPE_MAX_LENGTH: 100,
  EXTENSION_MAX_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 1000,

  // File size limits (in bytes)
  SIZE_LIMITS: {
    SMALL: 1024 * 1024, // 1MB
    MEDIUM: 10 * 1024 * 1024, // 10MB
    LARGE: 100 * 1024 * 1024, // 100MB
    MAX: 500 * 1024 * 1024, // 500MB
  },

  // Status values
  STATUS: {
    INACTIVATE: 'inactivate',
    ACTIVE: 'active',
    DELETED: 'deleted',
  },

  // File types
  TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    ARCHIVE: 'archive',
    OTHER: 'other',
  },

  // Allowed MIME types
  ALLOWED_MIME_TYPES: {
    IMAGE: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    VIDEO: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
    AUDIO: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ARCHIVE: ['application/zip', 'application/rar', 'application/7z'],
  },
} as const;

// Type definitions for better TypeScript support
export type FileStatus =
  (typeof FILE_CONSTANTS.STATUS)[keyof typeof FILE_CONSTANTS.STATUS];
export type FileType =
  (typeof FILE_CONSTANTS.TYPES)[keyof typeof FILE_CONSTANTS.TYPES];
export type FileSizeLimit =
  (typeof FILE_CONSTANTS.SIZE_LIMITS)[keyof typeof FILE_CONSTANTS.SIZE_LIMITS];
