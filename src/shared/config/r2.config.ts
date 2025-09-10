export const r2Config = () => ({
  // Cloudflare R2 Configuration
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  region: process.env.R2_REGION || 'auto',

  // R2 Public URL (Custom domain or R2.dev subdomain)
  publicUrl: process.env.R2_PUBLIC_URL,

  // Upload settings
  maxFileSize: parseInt(process.env.R2_MAX_FILE_SIZE || '104857600'), // 100MB default
  allowedMimeTypes: process.env.R2_ALLOWED_MIME_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain',
  ],

  // Folder structure
  folders: {
    media: 'media',
    thumbnails: 'thumbnails',
    previews: 'previews',
    temp: 'temp',
  },

  // Cache settings
  cacheControl: process.env.R2_CACHE_CONTROL || 'public, max-age=31536000', // 1 year
  expires: process.env.R2_EXPIRES || '31536000', // 1 year in seconds

  // CDN settings
  cdnEnabled: process.env.R2_CDN_ENABLED === 'true',
  cdnUrl: process.env.R2_CDN_URL,

  // Security settings
  presignedUrlExpiry: parseInt(process.env.R2_PRESIGNED_URL_EXPIRY || '3600'), // 1 hour
  corsEnabled: process.env.R2_CORS_ENABLED === 'true',

  // Image processing settings
  imageProcessing: {
    enabled: process.env.R2_IMAGE_PROCESSING_ENABLED === 'true',
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 400, height: 400 },
      { name: 'large', width: 800, height: 600 },
    ],
    quality: parseInt(process.env.R2_IMAGE_QUALITY || '85'),
    format: process.env.R2_IMAGE_FORMAT || 'webp',
  },
});

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  publicUrl?: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  folders: {
    media: string;
    thumbnails: string;
    previews: string;
    temp: string;
  };
  cacheControl: string;
  expires: string;
  cdnEnabled: boolean;
  cdnUrl?: string;
  presignedUrlExpiry: number;
  corsEnabled: boolean;
  imageProcessing: {
    enabled: boolean;
    thumbnailSizes: Array<{ name: string; width: number; height: number }>;
    quality: number;
    format: string;
  };
}
