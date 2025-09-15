import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';
import { Bookmark, BookmarkFolder } from './entities';

/**
 * Bookmarks Module
 *
 * Provides bookmark functionality for the application
 * Includes CRUD operations for bookmarks and folders
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, BookmarkFolder])],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
