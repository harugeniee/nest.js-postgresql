import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { StickerPackItem } from './sticker-pack-item.entity';
import { STICKER_CONSTANTS, StickerPackStatus } from 'src/shared/constants';

/**
 * Sticker Pack Entity
 *
 * Groups stickers into collections for better organization.
 * Similar to Discord sticker packs or Telegram sticker sets.
 */
@Entity('sticker_packs')
@Unique(['name'])
@Unique(['slug'])
@Index(['isPublished'])
@Index(['createdBy'])
export class StickerPack extends BaseEntityCustom {
  /**
   * Pack name for display
   * Maximum length: 100 characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.PACK_NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  /**
   * URL-friendly slug for the pack
   * Maximum length: 120 characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.PACK_SLUG_MAX_LENGTH,
    nullable: false,
  })
  slug: string;

  /**
   * Pack description
   * Maximum length: 255 characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.PACK_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description: string;

  /**
   * Whether the pack is published and visible to users
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  /**
   * Sort order for display
   * Default: 0
   */
  @Column({ type: 'int', default: 0 })
  sortValue: number;

  /**
   * ID of the user who created the pack
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: true })
  createdBy: string;

  /**
   * User information who created the pack
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy', referencedColumnName: 'id' })
  creator: User;

  /**
   * ID of the user who last updated the pack
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: true })
  updatedBy: string;

  /**
   * User information who last updated the pack
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy', referencedColumnName: 'id' })
  updater: User;

  /**
   * Sticker pack items (stickers in this pack)
   * One-to-Many relationship with StickerPackItem
   */
  @OneToMany(() => StickerPackItem, (item) => item.pack, {
    cascade: true,
  })
  items: StickerPackItem[];

  /**
   * Get the number of stickers in this pack
   * @returns {number} Number of stickers
   */
  getStickerCount(): number {
    return this.items ? this.items.length : 0;
  }

  /**
   * Check if pack is visible to users
   * @returns {boolean} True if published and not deleted
   */
  isVisible(): boolean {
    return this.isPublished && !this.deletedAt;
  }

  /**
   * Get pack status based on published state
   * @returns {StickerPackStatus} Pack status
   */
  getStatus(): StickerPackStatus {
    if (this.deletedAt) {
      return STICKER_CONSTANTS.PACK_STATUS.ARCHIVED;
    }
    return this.isPublished
      ? STICKER_CONSTANTS.PACK_STATUS.PUBLISHED
      : STICKER_CONSTANTS.PACK_STATUS.DRAFT;
  }
}
