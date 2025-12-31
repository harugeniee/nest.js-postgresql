import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation } from '@nestjs/swagger';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';

import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import {
  MediaQueryDto,
  MediaStatsOverviewDto,
  PresignedDownloadQueryDto,
  PresignedUploadDto,
  UpdateMediaDto,
} from './dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @UseInterceptors(AnalyticsInterceptor)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.MEDIA_UPLOAD,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.MEDIA,
  )
  @Auth()
  async uploadMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: Request & { user: AuthPayload },
    @Query('folder') customFolder?: string,
    @Query('scramble') scrambleParam?: string,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_IS_REQUIRED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse scramble parameter from query string to boolean
    // Only accept 'true', 'false', or undefined (default behavior)
    let scramble: boolean | undefined;
    if (scrambleParam !== undefined) {
      const normalizedParam = scrambleParam.toLowerCase().trim();
      if (normalizedParam === 'true') {
        scramble = true;
      } else if (normalizedParam === 'false') {
        scramble = false;
      } else {
        throw new HttpException(
          {
            messageKey: 'media.INVALID_SCRAMBLE_PARAMETER',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.mediaService.uploadMedia(
      files,
      req.user.uid,
      customFolder,
      scramble,
    );
  }

  @Get()
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.MEDIA_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.MEDIA,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async getMedia(@Query() query: MediaQueryDto) {
    return this.mediaService.getMedia(query);
  }

  /**
   * Get media statistics overview
   * Returns comprehensive platform-wide statistics about media files including counts by type,
   * status, storage provider, usage metrics, and top performers
   * IMPORTANT: This route must be defined BEFORE @Get(':id') to avoid route conflicts
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get media statistics overview',
    description:
      'Returns comprehensive platform-wide statistics about media files including counts by type, status, storage provider, usage metrics, and top performers',
  })
  async getMediaStatisticsOverview(): Promise<MediaStatsOverviewDto> {
    return this.mediaService.getMediaStatisticsOverview();
  }

  @Get(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.MEDIA_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.MEDIA,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Put(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.MEDIA_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.MEDIA,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async updateMedia(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.updateMedia(id, updateMediaDto);
  }

  @Delete(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.MEDIA_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.MEDIA,
  )
  @UseInterceptors(AnalyticsInterceptor)
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
      presignedUploadDto.filename,

      presignedUploadDto.contentType,

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

      query.expiresIn,
    );
    return {
      success: true,

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

  @Get(':id/scramble-key')
  @Auth()
  async getScrambleKey(@Param('id') id: string) {
    return this.mediaService.getScrambleKey(id);
  }
}
