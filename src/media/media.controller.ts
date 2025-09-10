import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { MediaService } from './media.service';
import {
  UpdateMediaDto,
  MediaQueryDto,
  PresignedUploadDto,
  PresignedDownloadQueryDto,
} from './dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMedia(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_IS_REQUIRED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.mediaService.uploadMedia(files);
  }

  @Get()
  async getMedia(@Query() query: MediaQueryDto) {
    return this.mediaService.getMedia(query);
  }

  @Get(':id')
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Put(':id')
  async updateMedia(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.updateMedia(id, updateMediaDto);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }

  @Post(':id/activate')
  async activateMedia(@Param('id') id: string) {
    return this.mediaService.activateMedia(id);
  }

  @Post(':id/deactivate')
  async deactivateMedia(@Param('id') id: string) {
    return this.mediaService.deactivateMedia(id);
  }

  @Post('presigned-upload')
  async generatePresignedUploadUrl(
    @Body() presignedUploadDto: PresignedUploadDto,
  ) {
    return this.mediaService.generatePresignedUploadUrl(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      presignedUploadDto.filename,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      presignedUploadDto.contentType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      presignedUploadDto.contentLength,
    );
  }

  @Get(':id/presigned-download')
  async generatePresignedDownloadUrl(
    @Param('id') id: string,
    @Query() query: PresignedDownloadQueryDto,
  ) {
    const presignedUrl = await this.mediaService.generatePresignedDownloadUrl(
      id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      query.expiresIn,
    );
    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      data: { presignedUrl, expiresIn: query.expiresIn },
      messageKey: 'media.PRESIGNED_URL_SUCCESS',
    };
  }

  @Get(':id/metadata')
  async getMediaFileMetadata(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.mediaService.getMediaFileMetadata(id);
  }

  @Get(':id/exists')
  async checkMediaFileExists(@Param('id') id: string) {
    return this.mediaService.checkMediaFileExists(id);
  }
}
