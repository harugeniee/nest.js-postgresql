import { PartialType } from '@nestjs/swagger';
import { CreateBookmarkFolderDto } from './create-bookmark-folder.dto';

/**
 * DTO for updating an existing bookmark folder
 */
export class UpdateBookmarkFolderDto extends PartialType(
  CreateBookmarkFolderDto,
) {}
