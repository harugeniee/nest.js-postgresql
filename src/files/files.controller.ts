import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

// import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  // constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  upload(@UploadedFiles() files: Array<Express.Multer.File>) {
    // const data = await this.filesService.uploadFiles(files);
    return;
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string) {
    // const data = await this.filesService.deleteFile(+id);
    return;
  }
}
