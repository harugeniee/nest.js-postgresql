import { instanceToPlain } from 'class-transformer';
import { globalSnowflake } from 'src/shared/libs/snowflake';
import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Base entity class that provides common fields and functionality for all entities
 *
 * Features:
 * - Snowflake ID generation for distributed systems
 * - UUID for external references
 * - Timestamps for creation, updates, and soft deletes
 * - Optimistic locking with version column
 * - Proper indexing for performance
 * - JSON serialization support
 */
export abstract class BaseEntityCustom extends BaseEntity {
  /**
   * Unique snowflake ID for distributed systems
   * Uses bigint type for large number support
   */
  @PrimaryColumn('bigint')
  id!: string;

  /**
   * UUID for external references and API responses
   * Indexed for fast lookups
   */
  @Index({ unique: true })
  @Column('uuid', { nullable: false, generated: 'uuid' })
  uuid!: string;

  /**
   * Creation timestamp with microsecond precision
   * Indexed for sorting and filtering
   */
  @Index()
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    precision: 6,
  })
  createdAt!: Date;

  /**
   * Last update timestamp with microsecond precision
   * Indexed for sorting and filtering
   */
  @Index()
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    precision: 6,
  })
  updatedAt!: Date;

  /**
   * Soft delete timestamp for data retention
   * Indexed for soft delete queries
   */
  @Index()
  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
    precision: 6,
  })
  deletedAt!: Date | null;

  /**
   * Optimistic locking version for concurrency control
   * Automatically incremented on each update
   */
  @VersionColumn({ default: 1 })
  version!: number;

  /**
   * Generate snowflake ID before inserting new entity
   * Ensures unique IDs across distributed systems
   */
  @BeforeInsert()
  generateId(): void {
    this.id = globalSnowflake.nextId().toString();
  }

  /**
   * Convert entity to plain object for JSON serialization
   * Removes TypeORM metadata and circular references
   */
  toJSON(): Record<string, unknown> {
    return instanceToPlain(this);
  }

  /**
   * Check if entity is soft deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * Get entity age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get time since last update in milliseconds
   */
  getTimeSinceUpdate(): number {
    return Date.now() - this.updatedAt.getTime();
  }
}
