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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';

import { MediaService } from './media.service';
import { UpdateMediaDto, MediaQueryDto } from './dto';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload media files' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMedia(@UploadedFiles() files: Array<Express.Multer.File>) {
    try {
      if (!files || files.length === 0) {
        throw new HttpException(
          {
            message: 'No files provided',
            error: 'MEDIA_IS_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.mediaService.uploadMedia(files);
      return {
        success: true,
        data: result,
        message: 'Media uploaded successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Upload failed',
          error: error.error || 'UPLOAD_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all media with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Media retrieved successfully' })
  async getMedia(@Query() query: MediaQueryDto) {
    try {
      const result = await this.mediaService.getMedia(query);
      return {
        success: true,
        data: result.result,
        pagination: result.pagination,
        message: 'Media retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to retrieve media',
          error: error.error || 'RETRIEVE_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiResponse({ status: 200, description: 'Media retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getMediaById(@Param('id') id: string) {
    try {
      const media = await this.mediaService.getMediaById(id);
      return {
        success: true,
        data: media,
        message: 'Media retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Media not found',
          error: error.error || 'MEDIA_NOT_FOUND',
        },
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update media metadata' })
  @ApiResponse({ status: 200, description: 'Media updated successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async updateMedia(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    try {
      const media = await this.mediaService.updateMedia(id, updateMediaDto);
      return {
        success: true,
        data: media,
        message: 'Media updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to update media',
          error: error.error || 'UPDATE_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteMedia(@Param('id') id: string) {
    try {
      await this.mediaService.deleteMedia(id);
      return {
        success: true,
        message: 'Media deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to delete media',
          error: error.error || 'DELETE_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate media' })
  @ApiResponse({ status: 200, description: 'Media activated successfully' })
  async activateMedia(@Param('id') id: string) {
    try {
      const media = await this.mediaService.activateMedia(id);
      return {
        success: true,
        data: media,
        message: 'Media activated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to activate media',
          error: error.error || 'ACTIVATION_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate media' })
  @ApiResponse({ status: 200, description: 'Media deactivated successfully' })
  async deactivateMedia(@Param('id') id: string) {
    try {
      const media = await this.mediaService.deactivateMedia(id);
      return {
        success: true,
        data: media,
        message: 'Media deactivated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to deactivate media',
          error: error.error || 'DEACTIVATION_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('presigned-upload')
  @ApiOperation({ summary: 'Generate presigned URL for direct upload to R2' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  async generatePresignedUploadUrl(
    @Body() body: { filename: string; contentType: string; contentLength?: number },
  ) {
    try {
      const result = await this.mediaService.generatePresignedUploadUrl(
        body.filename,
        body.contentType,
        body.contentLength,
      );
      return {
        success: true,
        data: result,
        message: 'Presigned URL generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to generate presigned URL',
          error: error.error || 'PRESIGNED_URL_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/presigned-download')
  @ApiOperation({ summary: 'Generate presigned URL for media download' })
  @ApiResponse({ status: 200, description: 'Presigned download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Media file not found' })
  async generatePresignedDownloadUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    try {
      const expires = expiresIn ? parseInt(expiresIn) : 3600;
      const presignedUrl = await this.mediaService.generatePresignedDownloadUrl(id, expires);
      return {
        success: true,
        data: { presignedUrl, expiresIn: expires },
        message: 'Presigned download URL generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to generate presigned download URL',
          error: error.error || 'PRESIGNED_URL_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/metadata')
  @ApiOperation({ summary: 'Get media file metadata from R2' })
  @ApiResponse({ status: 200, description: 'Media file metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Media file not found' })
  async getMediaFileMetadata(@Param('id') id: string) {
    try {
      const metadata = await this.mediaService.getMediaFileMetadata(id);
      return {
        success: true,
        data: metadata,
        message: 'Media file metadata retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to get media file metadata',
          error: error.error || 'METADATA_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/exists')
  @ApiOperation({ summary: 'Check if media file exists in R2' })
  @ApiResponse({ status: 200, description: 'File existence checked successfully' })
  @ApiResponse({ status: 404, description: 'Media file not found' })
  async checkMediaFileExists(@Param('id') id: string) {
    try {
      const exists = await this.mediaService.checkMediaFileExists(id);
      return {
        success: true,
        data: { exists },
        message: 'File existence checked successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'Failed to check file existence',
          error: error.error || 'EXISTS_CHECK_FAILED',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
