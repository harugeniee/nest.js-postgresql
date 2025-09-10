import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { CacheService, R2Service } from 'src/shared/services';
import { MEDIA_CONSTANTS, MediaStatus, MediaType } from 'src/shared/constants';

import { Media } from './entities/media.entity';
import { CreateMediaDto, UpdateMediaDto, MediaQueryDto } from './dto';

@Injectable()
export class MediaService extends BaseService<Media> {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
    private readonly r2Service: R2Service,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Media>(mediaRepository),
      {
        entityName: 'Media',
        cache: { enabled: true, ttlSec: 300, prefix: 'media', swrSec: 60 },
        defaultSearchField: 'name',
        relationsWhitelist: ['user'],
        selectWhitelist: [
          'id',
          'name',
          'title',
          'altText',
          'mimeType',
          'extension',
          'size',
          'description',
          'type',
          'url',
          'thumbnailUrl',
          'previewUrl',
          'status',
          'isPublic',
          'width',
          'height',
          'duration',
          'downloadCount',
          'viewCount',
          'createdAt',
          'updatedAt',
        ],
      },
      cacheService,
    );
  }

  // Override searchable columns for media-specific search
  protected getSearchableColumns(): (keyof Media)[] {
    return ['name', 'title', 'description', 'altText'];
  }

  /**
   * Upload multiple media files
   * @param files Array of uploaded files
   * @returns Array of created media entities
   */
  async uploadMedia(files: Array<Express.Multer.File>): Promise<Media[]> {
    try {
      if (!files || files.length === 0) {
        throw new HttpException(
          {
            messageKey: 'media.MEDIA_IS_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const mediaData: CreateMediaDto[] = [];

      for (const file of files) {
        try {
          const processedFile = await this.processUploadedFile(file);
          mediaData.push(processedFile);
        } catch (error: any) {
          this.logger.error(
            `Failed to process file ${file.originalname}:`,
            error,
          );
          // Continue processing other files even if one fails
        }
      }

      if (mediaData.length === 0) {
        throw new HttpException(
          {
            messageKey: 'media.MEDIA_UPLOAD_FAILED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Use BaseService createMany method
      return await this.createMany(mediaData);
    } catch (error: any) {
      this.logger.error('Upload media failed:', error);
      throw error;
    }
  }

  /**
   * Process a single uploaded file
   * @param file Uploaded file
   * @returns CreateMediaDto for creating media entity
   */
  private async processUploadedFile(
    file: Express.Multer.File,
  ): Promise<CreateMediaDto> {
    // Validate file size
    if (file.size > MEDIA_CONSTANTS.SIZE_LIMITS.MAX) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_SIZE_EXCEEDED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determine media type from MIME type
    const mediaType = this.determineMediaType(file.mimetype);

    // Generate unique filename
    const extension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.${extension}`;

    // Upload file to R2
    const uploadResult = await this.r2Service.uploadFile(file.buffer, {
      folder: this.configService.get('r2.folders.media'),
      filename: fileName,
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        mediaType: mediaType,
        uploadedBy: 'system', // This should be replaced with actual user ID
      },
    });

    // Generate thumbnail and preview URLs for images
    let thumbnailUrl: string | undefined;
    let previewUrl: string | undefined;

    if (mediaType === 'image') {
      thumbnailUrl = this.r2Service.generatePublicUrl(
        this.r2Service.generateThumbnailKey(uploadResult.key, 'medium'),
      );
      previewUrl = this.r2Service.generatePublicUrl(
        this.r2Service.generatePreviewKey(uploadResult.key),
      );
    }

    // Return CreateMediaDto for BaseService to handle
    return {
      name: file.originalname,
      mimeType: file.mimetype,
      extension: extension,
      size: file.size,
      type: mediaType,
      status: 'inactive' as MediaStatus,
      isPublic: false,
      // R2 specific fields
      path: uploadResult.key,
      url: uploadResult.url,
      originalName: file.originalname,
      key: uploadResult.key,
      thumbnailUrl,
      previewUrl,
      storageProvider: 'r2',
    } as CreateMediaDto;
  }

  /**
   * Determine media type from MIME type
   * @param mimeType MIME type string
   * @returns Media type enum value
   */
  private determineMediaType(mimeType: string): MediaType {
    for (const [typeKey, mimeTypes] of Object.entries(
      MEDIA_CONSTANTS.ALLOWED_MIME_TYPES,
    )) {
      if ((mimeTypes as readonly string[]).includes(mimeType)) {
        // Convert type key (e.g., "IMAGE") to type value (e.g., "image")
        return MEDIA_CONSTANTS.TYPES[
          typeKey as keyof typeof MEDIA_CONSTANTS.TYPES
        ] as MediaType;
      }
    }
    return MEDIA_CONSTANTS.TYPES.OTHER as MediaType;
  }

  /**
   * Get media with pagination and filters using BaseService
   * @param query Query parameters
   * @returns Paginated media results
   */
  async getMedia(query: MediaQueryDto): Promise<IPagination<Media>> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      isPublic,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      startDate,
      endDate,
      minSize,
      maxSize,
    } = query;

    // Build extra filters for BaseService
    const extraFilter: Record<string, unknown> = {};

    if (search) {
      extraFilter.query = search;
    }

    if (type) {
      extraFilter.type = type;
    }

    if (status) {
      extraFilter.status = status;
    }

    if (isPublic !== undefined) {
      extraFilter.isPublic = isPublic;
    }

    if (userId) {
      extraFilter.userId = userId;
    }

    if (startDate && endDate) {
      extraFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (minSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $gte: minSize,
      };
    }

    if (maxSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $lte: maxSize,
      };
    }

    // Use BaseService listOffset method
    return await this.listOffset(
      {
        page,
        limit,
        sortBy,
        order: sortOrder,
        ...extraFilter,
      } as AdvancedPaginationDto,
      extraFilter,
    );
  }

  /**
   * Get media with cursor pagination using BaseService
   * @param query Query parameters with cursor pagination
   * @returns Cursor paginated media results
   */
  async getMediaCursor(
    query: MediaQueryDto & { cursor?: string },
  ): Promise<IPaginationCursor<Media>> {
    const {
      limit = 10,
      search,
      type,
      status,
      isPublic,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      startDate,
      endDate,
      minSize,
      maxSize,
      cursor,
    } = query;

    // Build extra filters for BaseService
    const extraFilter: Record<string, unknown> = {};

    if (search) {
      extraFilter.query = search;
    }

    if (type) {
      extraFilter.type = type;
    }

    if (status) {
      extraFilter.status = status;
    }

    if (isPublic !== undefined) {
      extraFilter.isPublic = isPublic;
    }

    if (userId) {
      extraFilter.userId = userId;
    }

    if (startDate && endDate) {
      extraFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (minSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $gte: minSize,
      };
    }

    if (maxSize !== undefined) {
      extraFilter.size = {
        ...((extraFilter.size as object) || {}),
        $lte: maxSize,
      };
    }

    // Use BaseService listCursor method
    return await this.listCursor({
      limit,
      sortBy,
      order: sortOrder,
      cursor,
      ...extraFilter,
    } as CursorPaginationDto);
  }

  /**
   * Get media by ID using BaseService
   * @param id Media ID
   * @returns Media entity
   */
  async getMediaById(id: string): Promise<Media> {
    return await this.findById(id, { relations: ['user'] });
  }

  /**
   * Update media metadata using BaseService
   * @param id Media ID
   * @param updateMediaDto Update data
   * @returns Updated media entity
   */
  async updateMedia(
    id: string,
    updateMediaDto: UpdateMediaDto,
  ): Promise<Media> {
    return await this.update(id, updateMediaDto);
  }

  /**
   * Activate media
   * @param id Media ID
   * @returns Activated media entity
   */
  async activateMedia(id: string): Promise<Media> {
    const media = await this.findById(id);

    if (media.status === 'active') {
      return media;
    }

    return await this.update(id, { status: 'active' as MediaStatus });
  }

  /**
   * Deactivate media
   * @param id Media ID
   * @returns Deactivated media entity
   */
  async deactivateMedia(id: string): Promise<Media> {
    const media = await this.findById(id);

    if (media.status === 'inactive') {
      return media;
    }

    return await this.update(id, { status: 'inactive' as MediaStatus });
  }

  /**
   * Find media by user ID
   * @param userId User ID
   * @param pagination Pagination options
   * @returns Paginated media results for user
   */
  async getMediaByUserId(
    userId: string,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { userId });
  }

  /**
   * Find media by type
   * @param type Media type
   * @param pagination Pagination options
   * @returns Paginated media results by type
   */
  async getMediaByType(
    type: MediaType,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { type });
  }

  /**
   * Find public media
   * @param pagination Pagination options
   * @returns Paginated public media results
   */
  async getPublicMedia(
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { isPublic: true });
  }

  /**
   * Increment view count for media
   * @param id Media ID
   * @returns Updated media entity
   */
  async incrementViewCount(id: string): Promise<Media> {
    const media = await this.findById(id);
    return await this.update(id, { viewCount: (media.viewCount || 0) + 1 });
  }

  /**
   * Increment download count for media
   * @param id Media ID
   * @returns Updated media entity
   */
  async incrementDownloadCount(id: string): Promise<Media> {
    const media = await this.findById(id);
    return await this.update(id, {
      downloadCount: (media.downloadCount || 0) + 1,
    });
  }

  /**
   * Find media by status
   * @param status Media status
   * @param pagination Pagination options
   * @returns Paginated media results by status
   */
  async getMediaByStatus(
    status: MediaStatus,
    pagination: AdvancedPaginationDto,
  ): Promise<IPagination<Media>> {
    return await this.listOffset(pagination, { status });
  }

  /**
   * Generate presigned URL for media upload
   * @param filename Original filename
   * @param contentType MIME type
   * @param contentLength File size
   * @returns Presigned URL and media key
   */
  async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    contentLength?: number,
  ): Promise<{ presignedUrl: string; key: string; publicUrl: string }> {
    const extension = filename.split('.').pop();
    const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.${extension}`;
    const key = `${this.configService.get('r2.folders.media')}/${fileName}`;

    const presignedUrl = await this.r2Service.generatePresignedUploadUrl(key, {
      contentType,
      contentLength,
    });

    const publicUrl = this.r2Service.generatePublicUrl(key);

    return {
      presignedUrl,
      key,
      publicUrl,
    };
  }

  /**
   * Generate presigned URL for media download
   * @param id Media ID
   * @param expiresIn Expiry time in seconds
   * @returns Presigned URL
   */
  async generatePresignedDownloadUrl(
    id: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const media = await this.findById(id);
    return await this.r2Service.generatePresignedDownloadUrl(
      media.key,
      expiresIn,
    );
  }

  /**
   * Delete media file from R2
   * @param id Media ID
   */
  async deleteMediaFile(id: string): Promise<void> {
    const media = await this.findById(id);

    if (media.key) {
      await this.r2Service.deleteFile(media.key);

      // Delete thumbnail and preview if they exist
      if (media.type === 'image') {
        const thumbnailKey = this.r2Service.generateThumbnailKey(media.key);
        const previewKey = this.r2Service.generatePreviewKey(media.key);

        try {
          await Promise.all([
            this.r2Service.deleteFile(thumbnailKey),
            this.r2Service.deleteFile(previewKey),
          ]);
        } catch (error) {
          this.logger.warn(
            `Failed to delete thumbnail/preview for media ${id}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Get media file stream
   * @param id Media ID
   * @returns File stream
   */
  async getMediaFileStream(id: string): Promise<Readable> {
    const media = await this.findById(id);
    return await this.r2Service.downloadFile(media.key);
  }

  /**
   * Check if media file exists in R2
   * @param id Media ID
   * @returns True if file exists
   */
  async checkMediaFileExists(id: string): Promise<boolean> {
    const media = await this.findById(id);
    return await this.r2Service.fileExists(media.key);
  }

  /**
   * Get media file metadata from R2
   * @param id Media ID
   * @returns File metadata
   */
  async getMediaFileMetadata(id: string): Promise<any> {
    const media = await this.findById(id);
    return await this.r2Service.getFileMetadata(media.key);
  }

  /**
   * Override deleteMedia to also delete from R2
   * @param id Media ID
   */
  async deleteMedia(id: string): Promise<void> {
    // Delete from R2 first
    await this.deleteMediaFile(id);

    // Then soft delete from database
    await this.update(id, { status: 'deleted' as MediaStatus });
  }
}
