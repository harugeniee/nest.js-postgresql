import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { Genre } from '../entities';

/**
 * Genre Service
 *
 * Provides CRUD operations for genres with caching support.
 * Extends BaseService for common CRUD operations and adds genre-specific methods.
 */
@Injectable()
export class GenresService extends BaseService<Genre> {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Genre>(genreRepository),
      {
        entityName: 'Genre',
        cache: {
          enabled: true,
          ttlSec: 300, // 5 minutes for genre data
          prefix: 'genres',
          swrSec: 60, // Stale while revalidate for 1 minute
        },
        defaultSearchField: 'name',
        relationsWhitelist: {},
        selectWhitelist: {
          id: true,
          slug: true,
          name: true,
          description: true,
          icon: true,
          color: true,
          sortOrder: true,
          isNsfw: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Define which columns can be searched for text queries
   */
  protected getSearchableColumns(): (keyof Genre)[] {
    return ['name', 'slug', 'description'];
  }

  /**
   * Get all genres with offset pagination
   */
  async findAll(queryDto: any): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.listOffset(queryDto);
  }
}
