import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { IPagination, IPaginationCursor } from 'src/common/interface';
import { CursorPaginationDto } from 'src/common/dto';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { CacheService } from 'src/shared/services';
import { MediaService } from 'src/media/media.service';
import { STICKER_CONSTANTS, StickerFormat } from 'src/shared/constants';

interface MediaEntity {
  id: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

import { Sticker } from './entities/sticker.entity';
import { StickerPack } from './entities/sticker-pack.entity';
import { StickerPackItem } from './entities/sticker-pack-item.entity';
import {
  CreateStickerDto,
  UpdateStickerDto,
  QueryStickersDto,
  CreateStickerPackDto,
  UpdateStickerPackDto,
  QueryStickerPacksDto,
  AddStickerToPackDto,
  ReorderStickerPackItemsDto,
  RemoveStickerFromPackDto,
  BatchPackItemsDto,
} from './dto';

@Injectable()
export class StickersService extends BaseService<Sticker> {
  private readonly logger = new Logger(StickersService.name);

  constructor(
    @InjectRepository(Sticker)
    private readonly stickerRepository: Repository<Sticker>,
    @InjectRepository(StickerPack)
    private readonly stickerPackRepository: Repository<StickerPack>,
    @InjectRepository(StickerPackItem)
    private readonly stickerPackItemRepository: Repository<StickerPackItem>,
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Sticker>(stickerRepository),
      {
        entityName: 'Sticker',
        cache: { enabled: true, ttlSec: 300, prefix: 'sticker', swrSec: 60 },
        defaultSearchField: 'name',
        relationsWhitelist: {
          media: true,
          creator: true,
          updater: true,
        },
        selectWhitelist: {
          id: true,
          name: true,
          tags: true,
          description: true,
          format: true,
          available: true,
          status: true,
          width: true,
          height: true,
          durationMs: true,
          sortValue: true,
          media: {
            id: true,
            url: true,
            mimeType: true,
            size: true,
            width: true,
            height: true,
            duration: true,
          },
          creator: {
            id: true,
            name: true,
            email: true,
          },
          updater: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      cacheService,
    );
  }

  // Override searchable columns for sticker-specific search
  protected getSearchableColumns(): (keyof Sticker)[] {
    return ['name', 'tags', 'description'];
  }

  /**
   * Create a new sticker from existing media
   * @param dto Sticker creation data with mediaId
   * @param userId User ID creating the sticker
   * @returns Created sticker entity
   */
  async createSticker(dto: CreateStickerDto, userId: string): Promise<Sticker> {
    try {
      // Find the media by ID
      const media = (await this.mediaService.findById(
        dto.mediaId,
      )) as MediaEntity;
      if (!media) {
        throw new HttpException(
          {
            messageKey: 'media.MEDIA_NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate media constraints for stickers
      await this.validateStickerMedia(media);

      // Determine sticker format from MIME type
      const format = this.determineStickerFormat(media.mimeType);

      // Extract metadata for sticker-specific fields
      const metadata = this.extractStickerMetadata(media);

      // Create sticker entity
      const sticker = await this.create({
        mediaId: media.id,
        name: dto.name,
        tags: dto.tags || '',
        description: dto.description || '',
        format,
        available: true,
        status: STICKER_CONSTANTS.STATUS.APPROVED,
        width: metadata.width,
        height: metadata.height,
        durationMs: metadata.durationMs,
        sortValue: dto.sortValue || 0,
        createdBy: userId,
        updatedBy: userId,
      });

      return await this.findById(sticker.id, {
        relations: ['media', 'creator', 'updater'],
      });
    } catch (error: any) {
      this.logger.error('Failed to create sticker:', error);
      throw error;
    }
  }

  /**
   * Update sticker metadata
   * @param id Sticker ID
   * @param dto Update data
   * @param userId User ID updating the sticker
   * @returns Updated sticker entity
   */
  async updateSticker(
    id: string,
    dto: UpdateStickerDto,
    userId: string,
  ): Promise<Sticker> {
    await this.findById(id); // Verify sticker exists

    return await this.update(id, {
      ...dto,
      updatedBy: userId,
    });
  }

  /**
   * Delete sticker (soft delete)
   * @param id Sticker ID
   */
  async deleteSticker(id: string): Promise<void> {
    await this.findById(id); // Verify sticker exists

    // Soft delete the sticker
    await this.update(id, {
      available: false,
      status: STICKER_CONSTANTS.STATUS.REJECTED,
    });
  }

  /**
   * Get stickers with filters
   * @param query Query parameters
   * @returns Paginated stickers
   */
  async getStickers(query: QueryStickersDto): Promise<IPagination<Sticker>> {
    const { format, status, available, ...paginationDto } = query;

    // Build filters
    const filters: Record<string, any> = {};

    if (format) {
      filters.format = format;
    }

    if (status) {
      filters.status = status;
    }

    if (available !== undefined) {
      filters.available = available;
    }

    // Use BaseService listOffset with search and filters
    return await this.listOffset(paginationDto, filters, {
      relations: ['media', 'creator', 'updater'],
    });
  }

  /**
   * Get available stickers for public use
   * @param query Query parameters
   * @returns Paginated available stickers
   */
  async getAvailableStickers(
    query: QueryStickersDto,
  ): Promise<IPagination<Sticker>> {
    return await this.getStickers({
      ...query,
      available: true,
      status: STICKER_CONSTANTS.STATUS.APPROVED,
    });
  }

  /**
   * Get all stickers with advanced pagination (Admin only)
   * @param paginationDto Pagination parameters
   * @returns Paginated stickers
   */
  async findAll(
    paginationDto: QueryStickersDto,
  ): Promise<IPagination<Sticker>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all stickers with cursor pagination (Admin only)
   * @param paginationDto Cursor pagination parameters
   * @returns Cursor paginated stickers
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Sticker>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Create a new sticker pack
   * @param dto Pack creation data
   * @param userId User ID creating the pack
   * @returns Created sticker pack
   */
  async createStickerPack(
    dto: CreateStickerPackDto,
    userId: string,
  ): Promise<StickerPack> {
    // Check if slug already exists
    const existingPack = await this.stickerPackRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existingPack) {
      throw new HttpException(
        {
          messageKey: 'sticker.PACK_SLUG_EXISTS',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const pack = await this.stickerPackRepository.save({
      ...dto,
      createdBy: userId,
      updatedBy: userId,
    });

    const result = await this.stickerPackRepository.findOne({
      where: { id: pack.id },
      relations: ['creator', 'updater', 'items', 'items.sticker'],
    });

    if (!result) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  /**
   * Update sticker pack
   * @param id Pack ID
   * @param dto Update data
   * @param userId User ID updating the pack
   * @returns Updated sticker pack
   */
  async updateStickerPack(
    id: string,
    dto: UpdateStickerPackDto,
    userId: string,
  ): Promise<StickerPack> {
    const pack = await this.stickerPackRepository.findOne({ where: { id } });
    if (!pack) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== pack.slug) {
      const existingPack = await this.stickerPackRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existingPack) {
        throw new HttpException(
          {
            messageKey: 'sticker.PACK_SLUG_EXISTS',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.stickerPackRepository.update(id, {
      ...dto,
      updatedBy: userId,
    });

    const result = await this.stickerPackRepository.findOne({
      where: { id },
      relations: ['creator', 'updater', 'items', 'items.sticker'],
    });

    if (!result) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  /**
   * Delete sticker pack
   * @param id Pack ID
   */
  async deleteStickerPack(id: string): Promise<void> {
    const pack = await this.stickerPackRepository.findOne({ where: { id } });
    if (!pack) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Soft delete the pack
    await this.stickerPackRepository.update(id, { isPublished: false });
  }

  /**
   * Get sticker packs with filters
   * @param query Query parameters
   * @returns Paginated sticker packs
   */
  async getStickerPacks(
    query: QueryStickerPacksDto,
  ): Promise<IPagination<StickerPack>> {
    const { isPublished, ...paginationDto } = query;

    // Use custom query builder for complex relations
    const queryBuilder = this.stickerPackRepository
      .createQueryBuilder('pack')
      .leftJoinAndSelect('pack.creator', 'creator')
      .leftJoinAndSelect('pack.updater', 'updater')
      .leftJoinAndSelect('pack.items', 'items')
      .leftJoinAndSelect('items.sticker', 'sticker')
      .leftJoinAndSelect('sticker.media', 'media')
      .orderBy('pack.sortValue', 'ASC')
      .addOrderBy('pack.createdAt', 'DESC');

    // Apply filters
    if (isPublished !== undefined) {
      queryBuilder.andWhere('pack.isPublished = :isPublished', { isPublished });
    }

    // Apply search if provided
    if (paginationDto.query) {
      queryBuilder.andWhere(
        '(pack.name ILIKE :q OR pack.description ILIKE :q)',
        { q: `%${paginationDto.query}%` },
      );
    }

    // Apply pagination
    const offset =
      ((paginationDto.page || 1) - 1) * (paginationDto.limit || 20);
    queryBuilder.skip(offset).take(paginationDto.limit || 20);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      result: items,
      metaData: {
        pageSize: paginationDto.limit || 20,
        totalRecords: total,
        totalPages: Math.ceil(total / (paginationDto.limit || 20)),
        currentPage: paginationDto.page || 1,
        hasNextPage:
          (paginationDto.page || 1) <
          Math.ceil(total / (paginationDto.limit || 20)),
      },
    };
  }

  /**
   * Get published sticker packs for public use
   * @param query Query parameters
   * @returns Paginated published sticker packs
   */
  async getPublishedStickerPacks(
    query: QueryStickerPacksDto,
  ): Promise<IPagination<StickerPack>> {
    return await this.getStickerPacks({
      ...query,
      isPublished: true,
    });
  }

  /**
   * Add sticker to pack
   * @param packId Pack ID
   * @param dto Add sticker data
   * @returns Created pack item
   */
  async addStickerToPack(
    packId: string,
    dto: AddStickerToPackDto,
  ): Promise<StickerPackItem> {
    // Check if pack exists
    const pack = await this.stickerPackRepository.findOne({
      where: { id: packId },
    });
    if (!pack) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if sticker exists and is available
    const sticker = await this.findById(dto.stickerId);
    if (!sticker.isUsable()) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_NOT_AVAILABLE,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if sticker is already in pack
    const existingItem = await this.stickerPackItemRepository.findOne({
      where: { packId, stickerId: dto.stickerId },
    });
    if (existingItem) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_ITEM_EXISTS,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create pack item
    const packItem = await this.stickerPackItemRepository.save({
      packId,
      stickerId: dto.stickerId,
      sortValue: dto.sortValue || 0,
    });

    const result = await this.stickerPackItemRepository.findOne({
      where: { id: packItem.id },
      relations: ['pack', 'sticker', 'sticker.media'],
    });

    if (!result) {
      throw new HttpException(
        {
          messageKey:
            STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_ITEM_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  /**
   * Remove sticker from pack
   * @param packId Pack ID
   * @param dto Remove sticker data
   */
  async removeStickerFromPack(
    packId: string,
    dto: RemoveStickerFromPackDto,
  ): Promise<void> {
    const packItem = await this.stickerPackItemRepository.findOne({
      where: { packId, stickerId: dto.stickerId },
    });

    if (!packItem) {
      throw new HttpException(
        {
          messageKey:
            STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_ITEM_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.stickerPackItemRepository.remove(packItem);
  }

  /**
   * Reorder stickers in pack
   * @param packId Pack ID
   * @param dto Reorder data
   */
  async reorderStickerPackItems(
    packId: string,
    dto: ReorderStickerPackItemsDto,
  ): Promise<void> {
    // Update sort values for each sticker
    for (let i = 0; i < dto.stickerIds.length; i++) {
      await this.stickerPackItemRepository.update(
        { packId, stickerId: dto.stickerIds[i] },
        { sortValue: i },
      );
    }
  }

  /**
   * Batch operations on pack items
   * @param packId Pack ID
   * @param dto Batch operations data
   */
  async batchPackItems(packId: string, dto: BatchPackItemsDto): Promise<void> {
    const {
      addStickerIds = [],
      removeStickerIds = [],
      reorderStickerIds,
    } = dto;

    // Add stickers
    for (const stickerId of addStickerIds) {
      await this.addStickerToPack(packId, { stickerId });
    }

    // Remove stickers
    for (const stickerId of removeStickerIds) {
      await this.removeStickerFromPack(packId, { stickerId });
    }

    // Reorder if provided
    if (reorderStickerIds && reorderStickerIds.length > 0) {
      await this.reorderStickerPackItems(packId, {
        stickerIds: reorderStickerIds,
      });
    }
  }

  /**
   * Validate sticker media constraints
   * @param media Media entity
   */
  private async validateStickerMedia(media: MediaEntity): Promise<void> {
    // Check file size (512KB limit)
    if (media.size > STICKER_CONSTANTS.SIZE_LIMITS.MAX) {
      throw new HttpException(
        {
          messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_SIZE_EXCEEDED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check MIME type
    const allowedMimeTypes = Object.values(
      STICKER_CONSTANTS.ALLOWED_MIME_TYPES,
    ).flat();
    if (!allowedMimeTypes.includes(media.mimeType as never)) {
      throw new HttpException(
        {
          messageKey:
            STICKER_CONSTANTS.MESSAGE_CODE.STICKER_FORMAT_NOT_SUPPORTED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if media is already used as a sticker
    const existingSticker = await this.stickerRepository.findOne({
      where: { mediaId: media.id },
    });
    if (existingSticker) {
      throw new HttpException(
        {
          messageKey: 'sticker.MEDIA_ALREADY_USED_AS_STICKER',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Determine sticker format from MIME type
   * @param mimeType MIME type string
   * @returns Sticker format
   */
  private determineStickerFormat(mimeType: string): StickerFormat {
    for (const [format, mimeTypes] of Object.entries(
      STICKER_CONSTANTS.ALLOWED_MIME_TYPES,
    )) {
      if ((mimeTypes as readonly string[]).includes(mimeType)) {
        return format.toUpperCase() as StickerFormat;
      }
    }
    throw new HttpException(
      {
        messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_FORMAT_NOT_SUPPORTED,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Extract sticker metadata from media
   * @param media Media entity
   * @returns Sticker metadata
   */
  private extractStickerMetadata(media: MediaEntity): {
    width?: number;
    height?: number;
    durationMs?: number;
  } {
    return {
      width: media.width || undefined,
      height: media.height || undefined,
      durationMs: media.duration ? media.duration * 1000 : undefined, // Convert seconds to milliseconds
    };
  }
}
