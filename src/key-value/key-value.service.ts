import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { ContentType, KEY_VALUE_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsWhere,
  In,
  LessThan,
  Repository,
} from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { KeyValue } from './entities/key-value.entity';

/**
 * Key-Value Service
 *
 * Provides flexible key-value storage with TTL, namespacing, and caching support.
 * Extends BaseService for common CRUD operations and adds specialized key-value methods.
 */
@Injectable()
export class KeyValueService extends BaseService<KeyValue> {
  private readonly logger = new Logger(KeyValueService.name);

  constructor(
    @InjectRepository(KeyValue)
    private readonly keyValueRepository: Repository<KeyValue>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<KeyValue>(keyValueRepository),
      {
        entityName: 'KeyValue',
        cache: {
          enabled: true,
          ttlSec: KEY_VALUE_CONSTANTS.CACHE_TTL.KEY_VALUE,
          prefix: KEY_VALUE_CONSTANTS.CACHE_KEYS.KEY_VALUE,
          swrSec: KEY_VALUE_CONSTANTS.SWR_TTL.KEY_VALUE,
        },
        defaultSearchField: 'key',
        relationsWhitelist: {},
        selectWhitelist: {
          id: true,
          key: true,
          value: true,
          namespace: true,
          expiresAt: true,
          status: true,
          contentType: true,
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
  protected getSearchableColumns(): (keyof KeyValue)[] {
    return ['key', 'namespace'];
  }

  /**
   * Get a key-value pair by key and optional namespace
   * @param key - The key to retrieve
   * @param namespace - Optional namespace
   * @returns KeyValue entity or null if not found
   */
  async getByKey(key: string, namespace?: string): Promise<KeyValue | null> {
    const cacheKey = this.generateCacheKey('key', { key, namespace });
    const cached = await this.cacheService?.get(cacheKey);

    if (cached) {
      const entity = cached as KeyValue;
      // Check if cached entity is still valid
      if (entity.isActive()) {
        return entity;
      }
      // Remove expired entry from cache
      await this.cacheService?.delete(cacheKey);
    }

    const where: FindOptionsWhere<KeyValue> = { key };
    if (namespace !== undefined) {
      where.namespace = namespace;
    }

    const entity = await this.keyValueRepository.findOne({
      where,
    });

    if (entity?.isActive()) {
      await this.cacheService?.set(
        cacheKey,
        entity,
        this.cache?.ttlSec || 3600,
      );
      return entity;
    }

    return null;
  }

  /**
   * Get key-value pairs by key pattern (supports SQL LIKE)
   * @param pattern - Pattern to match keys (e.g., "user:%")
   * @param namespace - Optional namespace filter
   * @returns Array of matching KeyValue entities
   */
  async getByKeyPattern(
    pattern: string,
    namespace?: string,
  ): Promise<KeyValue[]> {
    const queryBuilder = this.keyValueRepository
      .createQueryBuilder('kv')
      .where('kv.key LIKE :pattern', { pattern })
      .andWhere('kv.status = :status', {
        status: KEY_VALUE_CONSTANTS.STATUS.ACTIVE,
      });

    if (namespace !== undefined) {
      queryBuilder.andWhere('kv.namespace = :namespace', { namespace });
    }

    // Check for expired entries
    queryBuilder.andWhere('(kv.expires_at IS NULL OR kv.expires_at > :now)', {
      now: new Date(),
    });

    return queryBuilder.getMany();
  }

  /**
   * Get all key-value pairs in a namespace
   * @param namespace - The namespace to query
   * @returns Array of KeyValue entities in the namespace
   */
  async getByNamespace(namespace: string): Promise<KeyValue[]> {
    const cacheKey = this.generateCacheKey('namespace', { namespace });
    const cached = await this.cacheService?.get(cacheKey);

    if (cached) {
      return cached as KeyValue[];
    }

    const entities = await this.keyValueRepository.find({
      where: {
        namespace,
        status: KEY_VALUE_CONSTANTS.STATUS.ACTIVE,
      },
    });

    // Filter out expired entries
    const activeEntities = entities.filter((entity) => entity.isActive());

    await this.cacheService?.set(
      cacheKey,
      activeEntities,
      this.cache?.ttlSec || 3600,
    );
    return activeEntities;
  }

  /**
   * Delete expired key-value pairs
   * @returns Number of deleted entries
   */
  async deleteExpired(): Promise<number> {
    const result = await this.keyValueRepository.update(
      {
        status: KEY_VALUE_CONSTANTS.STATUS.ACTIVE,
        expiresAt: LessThan(new Date()),
      } as FindOptionsWhere<KeyValue>,
      {
        status: KEY_VALUE_CONSTANTS.STATUS.EXPIRED,
      },
    );

    // Invalidate cache for expired entries
    await this.invalidateExpiredCache();

    return result.affected || 0;
  }

  /**
   * Set a key-value pair with TTL
   * @param key - The key
   * @param value - The value to store
   * @param ttlSeconds - Time to live in seconds
   * @param namespace - Optional namespace
   * @returns Created KeyValue entity
   */
  async setWithTTL(
    key: string,
    value: any,
    ttlSeconds: number,
    namespace?: string,
  ): Promise<KeyValue> {
    // Validate TTL
    if (
      ttlSeconds < KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS ||
      ttlSeconds > KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS
    ) {
      throw new Error(
        `TTL must be between ${KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS} and ${KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS} seconds`,
      );
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Check if key exists
    const existing = await this.getByKey(key, namespace);
    if (existing) {
      // Update existing
      return this.update(existing.id, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value,
        expiresAt,
        contentType: this.inferContentType(value),
      });
    } else {
      // Create new
      return this.create({
        key,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value,
        namespace,
        expiresAt,
        contentType: this.inferContentType(value),
      });
    }
  }

  /**
   * Atomically increment a numeric value
   * @param key - The key to increment
   * @param amount - Amount to increment (can be negative)
   * @param namespace - Optional namespace
   * @returns New value after increment
   */
  async increment(
    key: string,
    amount: number = 1,
    namespace?: string,
  ): Promise<number> {
    // Validate increment amount
    if (
      amount < KEY_VALUE_CONSTANTS.MIN_INCREMENT_VALUE ||
      amount > KEY_VALUE_CONSTANTS.MAX_INCREMENT_VALUE
    ) {
      throw new Error(
        `Increment amount must be between ${KEY_VALUE_CONSTANTS.MIN_INCREMENT_VALUE} and ${KEY_VALUE_CONSTANTS.MAX_INCREMENT_VALUE}`,
      );
    }

    const existing = await this.getByKey(key, namespace);
    let currentValue = 0;

    if (existing) {
      if (typeof existing.value === 'number') {
        currentValue = existing.value;
      } else if (typeof existing.value === 'string') {
        currentValue = Number.parseFloat(existing.value) || 0;
      }
    }

    const newValue = currentValue + amount;

    if (existing) {
      await this.update(existing.id, {
        value: newValue,
        contentType: KEY_VALUE_CONSTANTS.CONTENT_TYPES.NUMBER,
      });
    } else {
      await this.create({
        key,
        value: newValue,
        namespace,
        contentType: KEY_VALUE_CONSTANTS.CONTENT_TYPES.NUMBER,
      });
    }

    return newValue;
  }

  /**
   * Check if a key exists and is active
   * @param key - The key to check
   * @param namespace - Optional namespace
   * @returns True if key exists and is active
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const entity = await this.getByKey(key, namespace);
    return entity !== null;
  }

  /**
   * Get multiple key-value pairs by keys
   * @param keys - Array of keys to retrieve
   * @param namespace - Optional namespace
   * @returns Object with key-value pairs
   */
  async getMultiple(
    keys: string[],
    namespace?: string,
  ): Promise<Record<string, any>> {
    if (keys.length > KEY_VALUE_CONSTANTS.MAX_KEYS_IN_GET_MULTIPLE) {
      throw new Error(
        `Cannot retrieve more than ${KEY_VALUE_CONSTANTS.MAX_KEYS_IN_GET_MULTIPLE} keys at once`,
      );
    }

    const result: Record<string, any> = {};

    // Get all entities in one query for better performance
    const entities = await this.keyValueRepository.find({
      where: {
        key: In(keys),
        ...(namespace !== undefined && { namespace }),
        status: KEY_VALUE_CONSTANTS.STATUS.ACTIVE,
      } as FindOptionsWhere<KeyValue>,
    });

    // Filter active entities and build result
    for (const entity of entities) {
      if (entity.isActive()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result[entity.key] = entity.value;
      }
    }

    return result;
  }

  /**
   * Set multiple key-value pairs
   * @param entries - Object with key-value pairs to set
   * @param namespace - Optional namespace for all entries
   * @returns Array of created/updated KeyValue entities
   */
  async setMultiple(
    entries: Record<string, any>,
    namespace?: string,
  ): Promise<KeyValue[]> {
    const entryKeys = Object.keys(entries);
    if (entryKeys.length > KEY_VALUE_CONSTANTS.MAX_BATCH_SIZE) {
      throw new Error(
        `Cannot set more than ${KEY_VALUE_CONSTANTS.MAX_BATCH_SIZE} entries at once`,
      );
    }

    const results: KeyValue[] = [];

    // Process each entry
    for (const key of entryKeys) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = entries[key];
      const existing = await this.getByKey(key, namespace);

      if (existing) {
        const updated = await this.update(existing.id, {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value,
          contentType: this.inferContentType(value),
        });
        results.push(updated);
      } else {
        const created = await this.create({
          key,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value,
          namespace,
          contentType: this.inferContentType(value),
        });
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Generate cache key for different operations
   * @param operation - Cache operation type
   * @param params - Parameters for key generation
   * @returns Cache key string
   */
  private generateCacheKey(
    operation: string,
    params: Record<string, any>,
  ): string {
    const prefix = this.cache?.prefix || 'key-value';
    const keyData = { operation, ...params };
    return `${prefix}:${operation}:${JSON.stringify(keyData)}`;
  }

  /**
   * Invalidate cache for expired entries
   */
  private async invalidateExpiredCache(): Promise<void> {
    // Invalidate namespace caches as they may contain expired entries
    await this.cacheService?.deleteKeysByPattern(
      `${this.cache?.prefix || 'key-value'}:namespace:*`,
    );
  }

  /**
   * Infer content type from value
   * @param value - Value to analyze
   * @returns Content type
   */
  private inferContentType(value: any): ContentType {
    if (typeof value === 'string')
      return KEY_VALUE_CONSTANTS.CONTENT_TYPES.STRING;
    if (typeof value === 'number')
      return KEY_VALUE_CONSTANTS.CONTENT_TYPES.NUMBER;
    if (typeof value === 'boolean')
      return KEY_VALUE_CONSTANTS.CONTENT_TYPES.BOOLEAN;
    if (Array.isArray(value)) return KEY_VALUE_CONSTANTS.CONTENT_TYPES.ARRAY;
    if (typeof value === 'object' && value !== null)
      return KEY_VALUE_CONSTANTS.CONTENT_TYPES.OBJECT;
    return KEY_VALUE_CONSTANTS.CONTENT_TYPES.STRING; // fallback
  }

  /**
   * Lifecycle hook called before creating a new key-value pair
   * Performs validation and data normalization
   */
  protected async beforeCreate(
    data: DeepPartial<KeyValue>,
  ): Promise<DeepPartial<KeyValue>> {
    // Validate key format
    if (data.key) {
      data.key = data.key.trim();
      if (!this.isValidKey(data.key)) {
        throw new Error(
          'Invalid key format. Keys must contain only alphanumeric characters, hyphens, underscores, and colons.',
        );
      }
    }

    // Validate namespace format
    if (data.namespace) {
      data.namespace = data.namespace.trim();
      if (!this.isValidNamespace(data.namespace)) {
        throw new Error(
          'Invalid namespace format. Namespaces must contain only alphanumeric characters, hyphens, underscores, and colons.',
        );
      }
    }

    // Infer content type if not provided
    if (data.value !== undefined && !data.contentType) {
      data.contentType = this.inferContentType(data.value);
    }

    // Validate TTL
    if (data.expiresAt && data.expiresAt instanceof Date) {
      const ttlMs = data.expiresAt.getTime() - Date.now();
      const ttlSec = ttlMs / 1000;
      if (
        ttlSec < KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS ||
        ttlSec > KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS
      ) {
        throw new Error(
          `TTL must be between ${KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS} and ${KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS} seconds`,
        );
      }
    }

    // Set default status
    if (!data.status) {
      data.status = KEY_VALUE_CONSTANTS.STATUS.ACTIVE;
    }

    return data;
  }

  /**
   * Lifecycle hook called after creating a new key-value pair
   * Handles cache invalidation and side effects
   */
  protected async afterCreate(entity: KeyValue): Promise<void> {
    // Invalidate related caches
    await this.invalidateRelatedCaches(entity);

    // Log creation for monitoring
    this.logger?.log(`Key-value pair created: ${entity.key}`, {
      key: entity.key,
      namespace: entity.namespace,
      contentType: entity.contentType,
      hasExpiry: !!entity.expiresAt,
    });
  }

  /**
   * Lifecycle hook called before updating a key-value pair
   * Performs validation on update data
   */
  protected async beforeUpdate(
    id: string,
    patch: DeepPartial<KeyValue>,
  ): Promise<void> {
    // Validate content type if provided
    if (
      patch.contentType &&
      !Object.values(KEY_VALUE_CONSTANTS.CONTENT_TYPES).includes(
        patch.contentType,
      )
    ) {
      throw new Error('Invalid content type');
    }

    // Validate TTL if provided
    if (patch.expiresAt && patch.expiresAt instanceof Date) {
      const ttlMs = patch.expiresAt.getTime() - Date.now();
      const ttlSec = ttlMs / 1000;
      if (
        ttlSec < KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS ||
        ttlSec > KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS
      ) {
        throw new Error(
          `TTL must be between ${KEY_VALUE_CONSTANTS.MIN_TTL_SECONDS} and ${KEY_VALUE_CONSTANTS.MAX_TTL_SECONDS} seconds`,
        );
      }
    }

    // Infer content type if value is being updated
    if (patch.value !== undefined && !patch.contentType) {
      patch.contentType = this.inferContentType(patch.value);
    }
  }

  /**
   * Lifecycle hook called after updating a key-value pair
   * Handles cache invalidation and side effects
   */
  protected async afterUpdate(entity: KeyValue): Promise<void> {
    // Invalidate related caches
    await this.invalidateRelatedCaches(entity);

    // Log update for monitoring
    this.logger?.log(`Key-value pair updated: ${entity.key}`, {
      key: entity.key,
      namespace: entity.namespace,
      contentType: entity.contentType,
      hasExpiry: !!entity.expiresAt,
    });
  }

  /**
   * Lifecycle hook called before deleting a key-value pair
   * Can be overridden for custom deletion logic
   */
  protected async beforeDelete(id: string): Promise<void> {
    // Get entity before deletion for cache cleanup
    const entity = await this.findById(id);
    if (entity) {
      await this.invalidateRelatedCaches(entity);
    }
  }

  /**
   * Lifecycle hook called after deleting a key-value pair
   * Handles cache cleanup
   */
  protected async afterDelete(id: string): Promise<void> {
    // Log deletion for monitoring
    this.logger?.log(`Key-value pair deleted: ${id}`);
  }

  /**
   * Validate key format
   * @param key - Key to validate
   * @returns True if key is valid
   */
  private isValidKey(key: string): boolean {
    // Allow alphanumeric, hyphens, underscores, and colons
    const keyRegex = /^[a-zA-Z0-9_:-]+$/;
    return (
      keyRegex.test(key) && key.length <= KEY_VALUE_CONSTANTS.KEY_MAX_LENGTH
    );
  }

  /**
   * Validate namespace format
   * @param namespace - Namespace to validate
   * @returns True if namespace is valid
   */
  private isValidNamespace(namespace: string): boolean {
    // Same rules as key
    const namespaceRegex = /^[a-zA-Z0-9_:-]+$/;
    return (
      namespaceRegex.test(namespace) &&
      namespace.length <= KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH
    );
  }

  /**
   * Invalidate caches related to a key-value entity
   * @param entity - The entity that was modified
   */
  private async invalidateRelatedCaches(entity: KeyValue): Promise<void> {
    const operations: Promise<any>[] = [
      // Invalidate specific key cache
      this.cacheService?.delete(
        this.generateCacheKey('key', {
          key: entity.key,
          namespace: entity.namespace,
        }),
      ) || Promise.resolve(),

      // Invalidate namespace cache if entity has namespace
      entity.namespace
        ? this.cacheService?.deleteKeysByPattern(
            `${this.cache?.prefix || 'key-value'}:namespace:*${entity.namespace}*`,
          ) || Promise.resolve()
        : Promise.resolve(),

      // Invalidate list caches that might contain this entity
      this.cacheService?.deleteKeysByPattern(
        `${this.cache?.prefix || 'key-value'}:list:*`,
      ) || Promise.resolve(),
    ];

    await Promise.all(operations);
  }
}
