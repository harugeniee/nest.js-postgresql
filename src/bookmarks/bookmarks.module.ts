import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';
import { Bookmark, BookmarkFolder } from './entities';
import { BookmarkFolderService } from './services';
import { CacheService } from 'src/shared/services';

/**
 * Bookmarks Module
 *
 * Provides bookmark functionality for the application
 * Includes CRUD operations for bookmarks and folders
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, BookmarkFolder])],
  controllers: [BookmarksController],
  providers: [BookmarksService, BookmarkFolderService, CacheService],
  exports: [BookmarksService, BookmarkFolderService],
})
export class BookmarksModule {}
