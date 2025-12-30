import { instanceToPlain } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';

import {
  ContentType,
  KEY_VALUE_CONSTANTS,
  KeyValueStatus,
} from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';

/**
 * Key-Value Entity
 *
 * Represents a flexible key-value storage system for various application data.
 * Supports namespacing, TTL, metadata, and different content types.
 */
@Entity('key_values')
@Index(['namespace'])
@Index(['expiresAt'])
@Index(['status'])
@Index(['contentType'])
@Index(['namespace', 'key'], { unique: true })
@Index(['status', 'expiresAt'])
export class KeyValue extends BaseEntityCustom {
  /**
   * Unique key identifier
   * Must be unique within a namespace
   */
  @Column({
    type: 'varchar',
    length: KEY_VALUE_CONSTANTS.KEY_MAX_LENGTH,
    nullable: false,
    comment: 'Unique key identifier within namespace',
  })
  key: string;

  /**
   * Flexible value storage
   * Can store any JSON-serializable data
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    comment: 'Flexible value storage supporting any JSON data',
  })
  value: any;

  /**
   * Optional namespace for grouping keys
   * Allows logical separation of key spaces
   */
  @Column({
    type: 'varchar',
    length: KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH,
    nullable: true,
    comment: 'Optional namespace for grouping related keys',
  })
  namespace?: string;

  /**
   * Optional TTL for automatic expiration
   * Entries are automatically marked as expired when this time is reached
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Optional expiration timestamp for automatic cleanup',
  })
  expiresAt?: Date;

  /**
   * Additional metadata for the key-value pair
   * Can store tags, version info, or other contextual data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata like tags, version, or custom properties',
  })
  metadata?: Record<string, any>;

  /**
   * Content type hint for the value
   * Helps with type inference and validation
   */
  @Column({
    type: 'varchar',
    length: KEY_VALUE_CONSTANTS.CONTENT_TYPE_MAX_LENGTH,
    nullable: true,
    comment: 'Hint about the value type (string, number, object, etc.)',
  })
  contentType?: ContentType;

  /**
   * Status for lifecycle management
   * Controls visibility and behavior of the key-value pair
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: KEY_VALUE_CONSTANTS.STATUS.ACTIVE,
    enum: KEY_VALUE_CONSTANTS.STATUS,
    comment: 'Lifecycle status: active, expired, or deleted',
  })
  status: KeyValueStatus;

  /**
   * Check if the key-value pair is expired
   * @returns {boolean} True if expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() >= this.expiresAt;
  }

  /**
   * Check if the key-value pair is active
   * @returns {boolean} True if active and not expired
   */
  isActive(): boolean {
    return (
      this.status === KEY_VALUE_CONSTANTS.STATUS.ACTIVE && !this.isExpired()
    );
  }

  /**
   * Get time remaining until expiration in milliseconds
   * @returns {number} Milliseconds until expiry, or -1 if no expiry
   */
  getTimeToExpiry(): number {
    if (!this.expiresAt) return -1;
    const now = new Date().getTime();
    const expiry = this.expiresAt.getTime();
    return Math.max(0, expiry - now);
  }

  /**
   * Get time since creation in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.createdAt.valueOf();
  }

  /**
   * Get a summary of the key-value pair (without the full value)
   * @returns {object} Summary object
   */
  getSummary(): {
    id: string;
    key: string;
    namespace?: string;
    contentType?: ContentType;
    status: KeyValueStatus;
    isExpired: boolean;
    timeToExpiry: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      key: this.key,
      namespace: this.namespace,
      contentType: this.contentType,
      status: this.status,
      isExpired: this.isExpired(),
      timeToExpiry: this.getTimeToExpiry(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Convert entity to plain object for JSON serialization
   * Removes TypeORM metadata and sensitive fields
   */
  toJSON(): Record<string, unknown> {
    const result = instanceToPlain(this);

    // Remove sensitive internal fields
    delete result.uuid;
    delete result.version;

    return result;
  }
}
