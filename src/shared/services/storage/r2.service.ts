import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

import { R2Config } from 'src/shared/config';
import { globalSnowflake } from 'src/shared/libs/snowflake';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  expires?: number;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // seconds
  contentType?: string;
  contentLength?: number;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly config: R2Config;

  constructor(private readonly configService: ConfigService) {
    // Get R2 configuration with proper typing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = this.configService.getOrThrow('r2');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.config = config as R2Config;

    // Initialize S3 client for R2
    this.s3Client = new S3Client({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      region: this.config.region,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        accessKeyId: this.config.accessKeyId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.logger.log('R2Service initialized');
  }

  /**
   * Upload file to R2
   * @param file File buffer or stream
   * @param options Upload options
   * @returns Upload result
   */
  async uploadFile(
    file: Buffer | Readable,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        folder = this.config.folders.media,
        filename,
        contentType = 'application/octet-stream',
        metadata = {},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        cacheControl = this.config.cacheControl,
        expires,
      } = options;

      // Generate unique filename if not provided
      const finalFilename =
        globalSnowflake.nextId().toString() + '_' + filename ||
        this.generateUniqueFilename();
      const key = `${folder}/${finalFilename}`;

      // Prepare upload parameters
      const uploadParams = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        CacheControl: cacheControl,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Add expires header if provided
      if (expires) {
        uploadParams['Expires'] = new Date(Date.now() + expires * 1000);
      }

      // Upload file
      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3Client.send(command);

      // Generate public URL
      const url = this.generatePublicUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        size: Buffer.isBuffer(file) ? file.length : 0,
        mimeType: contentType,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to R2:', error);
      throw new HttpException(
        {
          messageKey: 'media.STORAGE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload multiple files to R2
   * @param files Array of files with options
   * @returns Array of upload results
   */
  async uploadFiles(
    files: Array<{ file: Buffer | Readable; options?: UploadOptions }>,
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(({ file, options }) =>
      this.uploadFile(file, options),
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error('Failed to upload multiple files to R2:', error);
      throw new HttpException(
        {
          messageKey: 'media.STORAGE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download file from R2
   * @param key File key
   * @returns File stream
   */
  async downloadFile(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      return result.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to download file ${key}:`, error);
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Delete file from R2
   * @param key File key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new HttpException(
        {
          messageKey: 'media.STORAGE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete multiple files from R2
   * @param keys Array of file keys
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      this.logger.error('Failed to delete multiple files from R2:', error);
      throw new HttpException(
        {
          messageKey: 'media.STORAGE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get file metadata
   * @param key File key
   * @returns File metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      return {
        key,
        size: result.ContentLength,
        mimeType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata ${key}:`, error);
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Generate presigned URL for upload
   * @param key File key
   * @param options Presigned URL options
   * @returns Presigned URL
   */
  async generatePresignedUploadUrl(
    key: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    try {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        expiresIn = this.config.presignedUrlExpiry,
        contentType = 'application/octet-stream',
        contentLength,
      } = options;

      const command = new PutObjectCommand({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for ${key}:`,
        error,
      );
      throw new HttpException(
        {
          messageKey: 'media.PRESIGNED_URL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate presigned URL for download
   * @param key File key
   * @param expiresIn Expiry time in seconds
   * @returns Presigned URL
   */
  async generatePresignedDownloadUrl(
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    expiresIn: number = this.config.presignedUrlExpiry,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned download URL for ${key}:`,
        error,
      );
      throw new HttpException(
        {
          messageKey: 'media.PRESIGNED_URL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List files in a folder
   * @param prefix Folder prefix
   * @param maxKeys Maximum number of keys to return
   * @returns List of file keys
   */
  async listFiles(
    prefix: string = '',
    maxKeys: number = 1000,
  ): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        Bucket: this.config.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await this.s3Client.send(command);
      return result.Contents?.map((obj) => obj.Key || '') || [];
    } catch (error) {
      this.logger.error(`Failed to list files with prefix ${prefix}:`, error);
      throw new HttpException(
        {
          messageKey: 'media.STORAGE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if file exists
   * @param key File key
   * @returns True if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique filename
   * @param extension File extension
   * @returns Unique filename
   */
  private generateUniqueFilename(extension?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = extension ? `.${extension}` : '';
    return `${timestamp}_${random}${ext}`;
  }

  /**
   * Generate public URL for file
   * @param key File key
   * @returns Public URL
   */
  generatePublicUrl(key: string): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this.config.cdnEnabled && this.config.cdnUrl) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return `${this.config.cdnUrl}/${key}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this.config.publicUrl) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return `${this.config.publicUrl}/${key}`;
    }

    // Fallback to R2.dev URL
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return `https://${this.config.bucketName}.${this.config.accountId}.r2.cloudflarestorage.com/${key}`;
  }

  /**
   * Generate thumbnail key
   * @param originalKey Original file key
   * @param size Thumbnail size
   * @returns Thumbnail key
   */
  generateThumbnailKey(originalKey: string, size: string = 'medium'): string {
    const pathParts = originalKey.split('/');
    const filename = pathParts.pop();
    const folder = pathParts.join('/');
    const nameWithoutExt = filename?.split('.')[0];
    const ext = filename?.split('.').pop();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return `${this.config.folders.thumbnails}/${folder}/${nameWithoutExt}_${size}.${ext}`;
  }

  /**
   * Generate preview key
   * @param originalKey Original file key
   * @returns Preview key
   */
  generatePreviewKey(originalKey: string): string {
    const pathParts = originalKey.split('/');
    const filename = pathParts.pop();
    const folder = pathParts.join('/');
    const nameWithoutExt = filename?.split('.')[0];
    const ext = filename?.split('.').pop();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return `${this.config.folders.previews}/${folder}/${nameWithoutExt}_preview.${ext}`;
  }
}
