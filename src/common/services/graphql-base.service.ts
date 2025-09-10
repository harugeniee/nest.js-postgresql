import { Injectable, Optional } from '@nestjs/common';
import { BaseService, QOpts, TxCtx } from './base.service';
import {
  BaseRepository,
  BaseRepositoryFindByIdOpts,
} from '../repositories/base.repository';
import { CacheOptions, CacheService } from 'src/shared/services';
import {
  GraphQLPaginationDto,
  GraphQLConnection,
  GraphQLFieldNode,
} from '../dto/graphql-pagination.dto';
import { CursorPaginationDto } from '../dto/cursor-pagination.dto';
import { IPaginationCursor } from '../interface';
import { encodeCursor } from '../utils';
import { FindOptionsSelect } from 'typeorm';

// Extended interface for GraphQL-specific repository methods
interface GraphQLBaseRepository<T> extends BaseRepository<T> {
  findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<T>): Promise<T[]>;
}

/**
 * GraphQL-optimized base service that extends BaseService
 * Adds GraphQL-specific methods for pagination, data loading, and field selection
 */
@Injectable()
export abstract class GraphQLBaseService<
  T extends { id: string },
> extends BaseService<T> {
  constructor(
    protected readonly repo: GraphQLBaseRepository<T>,
    protected readonly opts: {
      entityName: string;
      idKey?: string;
      softDelete?: boolean;
      relationsWhitelist?: string[];
      selectWhitelist?: FindOptionsSelect<T>;
      cache?: CacheOptions & { prefix?: string };
      emitEvents?: boolean;
      defaultSearchField?: string;
    },
    @Optional() protected readonly cacheService?: CacheService,
    @Optional()
    protected readonly eventEmitter?: {
      emit?: (event: string, payload: unknown) => unknown;
    },
  ) {
    super(repo, opts, cacheService, eventEmitter);
  }

  /**
   * Find multiple entities by IDs with preserved order
   * Optimized for GraphQL DataLoader pattern
   */
  async findByIds(
    ids: string[],
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<(T | null)[]> {
    if (ids.length === 0) return [];

    const safe = this.applyQueryOpts(opts);
    const entities = await this.repo.findByIds(ids, safe);

    // Preserve order and handle missing entities
    return ids.map((id) => entities.find((e) => e.id === id) ?? null);
  }

  /**
   * Find multiple entities by IDs and return as Map for efficient lookups
   * Useful for GraphQL resolvers that need to batch load related entities
   */
  async findByIdsMap(
    ids: string[],
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<Map<string, T>> {
    if (ids.length === 0) return new Map();

    const entities = await this.findByIds(ids, opts, ctx);
    const map = new Map<string, T>();

    entities.forEach((entity, index) => {
      if (entity) {
        map.set(ids[index], entity);
      }
    });

    return map;
  }

  /**
   * GraphQL connection pagination following Relay specification
   * Supports both forward (first/after) and backward (last/before) pagination
   */
  async listGraphQL(
    pagination: GraphQLPaginationDto,
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<GraphQLConnection<T>> {
    const { first, after, last, before, sortBy } = pagination;

    // Validate pagination parameters
    if (first && last) {
      throw new Error('Cannot use both first and last parameters');
    }

    if (after && before) {
      throw new Error('Cannot use both after and before parameters');
    }

    // Convert to cursor pagination for BaseService
    // Note: BaseService.listCursor() will handle cursor decoding internally
    const cursorDto: CursorPaginationDto = {
      page: 1, // Required by PaginationDto, but not used in cursor pagination
      limit: first || last || 10,
      cursor: after || before, // Raw cursor string - will be decoded by BaseService
      sortBy,
      order: after ? 'ASC' : 'DESC',
    };

    // Delegate cursor pagination to BaseService (which handles decodeCursor)
    const result = await this.listCursor(cursorDto, extraFilter, opts, ctx);

    // Format result and create new cursors for GraphQL response
    return this.formatGraphQLConnection(result, first, last, after, before);
  }

  /**
   * Format cursor pagination result to GraphQL connection format
   */
  private formatGraphQLConnection(
    result: IPaginationCursor<T>,
    first?: number,
    last?: number,
    after?: string,
    before?: string,
  ): GraphQLConnection<T> {
    const { result: data, metaData } = result;

    if (data.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
    }

    const edges = data.map((item) => ({
      node: item,
      cursor: this.encodeCursor(item, metaData.sortBy),
    }));

    const pageInfo = {
      hasNextPage: data.length === (first || last || 10),
      hasPreviousPage: !!metaData.prevCursor,
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor,
    };

    return {
      edges,
      pageInfo,
      totalCount: data.length,
    };
  }

  /**
   * Encode cursor for GraphQL pagination
   * Uses the same cursor encoding logic as the base service
   */
  private encodeCursor(entity: T, sortBy: string): string {
    return encodeCursor({
      key: sortBy,
      order: 'ASC',
      value: {
        [sortBy]: entity[sortBy as keyof T],
        [String(this.idKey)]: entity[this.idKey],
      },
    });
  }

  /**
   * Find entities with GraphQL-optimized field selection
   * Automatically extracts fields from GraphQL resolve info
   */
  async findWithGraphQLFields(
    where: Parameters<this['findOne']>[0],
    graphQLInfo: { fieldNodes: GraphQLFieldNode[] },
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<T | null> {
    // Extract selected fields from GraphQL info
    const selectedFields = this.extractFieldsFromGraphQLInfo(graphQLInfo);

    // Apply field selection if available
    const graphQLOpts: QOpts<T> = {
      ...opts,
      select: selectedFields ?? opts?.select,
    };

    return this.findOne(where, graphQLOpts, ctx);
  }

  /**
   * List entities with GraphQL-optimized field selection
   */
  async listWithGraphQLFields(
    pagination: GraphQLPaginationDto,
    graphQLInfo: { fieldNodes: GraphQLFieldNode[] },
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<GraphQLConnection<T>> {
    // Extract selected fields from GraphQL info
    const selectedFields = this.extractFieldsFromGraphQLInfo(graphQLInfo);

    // Apply field selection if available
    const graphQLOpts: QOpts<T> = {
      ...opts,
      select: selectedFields ?? opts?.select,
    };

    return this.listGraphQL(pagination, extraFilter, graphQLOpts, ctx);
  }

  /**
   * Extract field names from GraphQL resolve info and convert to FindOptionsSelect
   * This is a simplified version - in practice you might want to use a GraphQL library
   */
  private extractFieldsFromGraphQLInfo(graphQLInfo: {
    fieldNodes: GraphQLFieldNode[];
  }): FindOptionsSelect<T> | undefined {
    try {
      // This is a simplified field extraction
      // In a real implementation, you'd use a GraphQL library to parse the selection set
      const fields: string[] = [];

      // Recursively extract field names from the selection set
      const extractFields = (nodes: GraphQLFieldNode[]): void => {
        nodes.forEach((node: GraphQLFieldNode) => {
          if (node.kind === 'Field' && node.name?.value) {
            fields.push(node.name.value);
          }
          if (node.selectionSet?.selections) {
            extractFields(node.selectionSet.selections);
          }
        });
      };

      extractFields(graphQLInfo.fieldNodes);

      // Filter out non-entity fields
      const validFields = fields.filter(
        (field) =>
          field !== '__typename' && field !== 'id' && field !== 'cursor',
      );

      // Convert to FindOptionsSelect format
      if (validFields.length === 0) {
        return undefined;
      }

      const select: FindOptionsSelect<T> = {};
      for (const field of validFields) {
        (select as Record<string, unknown>)[field] = true;
      }

      return select;
    } catch {
      // If field extraction fails, return undefined (will use default selection)
      return undefined;
    }
  }

  /**
   * Batch load entities by IDs with caching
   * Optimized for GraphQL DataLoader pattern
   */
  async batchLoadByIds(
    ids: string[],
    opts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<(T | null)[]> {
    if (ids.length === 0) return [];

    // Try to get from cache first
    const cacheKey = this.cache
      ? `${this.cache.prefix}:batch:${[...ids].sort((a, b) => a.localeCompare(b)).join(',')}`
      : undefined;
    if (cacheKey) {
      const cached = await this.cacheService?.get(cacheKey);
      if (cached) return cached as (T | null)[];
    }

    // Load from database
    const result = await this.findByIds(ids, opts, ctx);

    // Cache the result
    if (cacheKey && this.cache) {
      await this.cacheService?.set(cacheKey, result, this.cache.ttlSec);
    }

    return result;
  }

  /**
   * Invalidate batch cache when entities are updated
   */
  protected async invalidateBatchCache(): Promise<void> {
    if (!this.cache) return;

    // Delete all batch cache keys
    await this.cacheService?.deleteKeysByPattern(
      `${this.cache.prefix}:batch:*`,
    );
  }

  /**
   * Override cache invalidation to also clear batch cache
   */
  protected async invalidateCacheForEntity(id: string): Promise<void> {
    await super.invalidateCacheForEntity(id);
    await this.invalidateBatchCache();
  }
}
