import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { StickersService } from './stickers.service';
import {
  CreateStickerDto,
  UpdateStickerDto,
  QueryStickersDto,
  CreateStickerPackDto,
  UpdateStickerPackDto,
  QueryStickerPacksDto,
  AddStickerToPackDto,
  ReorderStickerPackItemsDto,
  BatchPackItemsDto,
} from './dto';

@ApiTags('Stickers')
@Controller('stickers')
export class StickersController {
  constructor(private readonly stickersService: StickersService) {}

  @Post()
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new sticker from existing media (Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Sticker created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async createSticker(
    @Body() dto: CreateStickerDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.stickersService.createSticker(dto, req.user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Get stickers (public available stickers only)' })
  @ApiResponse({ status: 200, description: 'Stickers retrieved successfully' })
  async getStickers(@Query() query: QueryStickersDto) {
    return this.stickersService.getAvailableStickers(query);
  }

  @Get('admin')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stickers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stickers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStickersAdmin(@Query() query: QueryStickersDto) {
    return this.stickersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sticker by ID' })
  @ApiResponse({ status: 200, description: 'Sticker retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sticker not found' })
  async getSticker(@Param('id') id: string) {
    return this.stickersService.findById(id, {
      relations: ['media', 'creator', 'updater'],
    });
  }

  @Patch(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sticker (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sticker updated successfully' })
  @ApiResponse({ status: 404, description: 'Sticker not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSticker(
    @Param('id') id: string,
    @Body() dto: UpdateStickerDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.stickersService.updateSticker(id, dto, req.user.uid);
  }

  @Delete(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete sticker (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sticker deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sticker not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteSticker(@Param('id') id: string) {
    await this.stickersService.deleteSticker(id);
    return { message: 'Sticker deleted successfully' };
  }
}

@ApiTags('Sticker Packs')
@Controller('sticker-packs')
export class StickerPacksController {
  constructor(private readonly stickersService: StickersService) {}

  @Post()
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new sticker pack (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Sticker pack created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createStickerPack(
    @Body() dto: CreateStickerPackDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.stickersService.createStickerPack(dto, req.user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Get sticker packs (public published packs only)' })
  @ApiResponse({
    status: 200,
    description: 'Sticker packs retrieved successfully',
  })
  async getStickerPacks(@Query() query: QueryStickerPacksDto) {
    return this.stickersService.getPublishedStickerPacks(query);
  }

  @Get('admin')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sticker packs (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sticker packs retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStickerPacksAdmin(@Query() query: QueryStickerPacksDto) {
    return this.stickersService.getStickerPacks(query);
  }

  @Get('browse')
  @ApiOperation({ summary: 'Browse published sticker packs' })
  @ApiResponse({
    status: 200,
    description: 'Sticker packs retrieved successfully',
  })
  async browseStickerPacks(@Query() query: QueryStickerPacksDto) {
    return this.stickersService.getPublishedStickerPacks(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sticker pack by ID' })
  @ApiResponse({
    status: 200,
    description: 'Sticker pack retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sticker pack not found' })
  async getStickerPack(@Param('id') id: string) {
    return await this.stickersService.getStickerPackById(id);
  }

  @Patch(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sticker pack (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sticker pack updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Sticker pack not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStickerPack(
    @Param('id') id: string,
    @Body() dto: UpdateStickerPackDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.stickersService.updateStickerPack(id, dto, req.user.uid);
  }

  @Delete(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete sticker pack (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sticker pack deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Sticker pack not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteStickerPack(@Param('id') id: string) {
    await this.stickersService.deleteStickerPack(id);
    return { message: 'Sticker pack deleted successfully' };
  }

  @Post(':id/items')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add sticker to pack (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Sticker added to pack successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Pack or sticker not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addStickerToPack(
    @Param('id') packId: string,
    @Body() dto: AddStickerToPackDto,
  ) {
    return this.stickersService.addStickerToPack(packId, dto);
  }

  @Put(':id/items')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder stickers in pack (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stickers reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Pack not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async reorderStickerPackItems(
    @Param('id') packId: string,
    @Body() dto: ReorderStickerPackItemsDto,
  ) {
    await this.stickersService.reorderStickerPackItems(packId, dto);
    return { message: 'Stickers reordered successfully' };
  }

  @Post(':id/items/batch')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch operations on pack items (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Batch operations completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Pack not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async batchPackItems(
    @Param('id') packId: string,
    @Body() dto: BatchPackItemsDto,
  ) {
    await this.stickersService.batchPackItems(packId, dto);
    return { message: 'Batch operations completed successfully' };
  }

  @Delete(':id/items/:stickerId')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove sticker from pack (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sticker removed from pack successfully',
  })
  @ApiResponse({ status: 404, description: 'Pack or sticker not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeStickerFromPack(
    @Param('id') packId: string,
    @Param('stickerId') stickerId: string,
  ) {
    await this.stickersService.removeStickerFromPack(packId, { stickerId });
    return { message: 'Sticker removed from pack successfully' };
  }
}
