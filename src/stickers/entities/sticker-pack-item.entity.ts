import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Sticker } from './sticker.entity';
import { StickerPack } from './sticker-pack.entity';

/**
 * Sticker Pack Item Entity
 *
 * Junction table linking stickers to packs with ordering.
 * Allows stickers to be organized in multiple packs with different orders.
 */
@Entity('sticker_pack_items')
@Unique(['packId', 'stickerId'])
@Index(['packId'])
@Index(['stickerId'])
@Index(['packId', 'sortValue'])
export class StickerPackItem extends BaseEntityCustom {
  /**
   * ID of the sticker pack
   * Links to sticker_packs table
   */
  @Column({ type: 'bigint', nullable: false })
  packId: string;

  /**
   * Sticker pack information
   * Many-to-One relationship with StickerPack entity
   */
  @ManyToOne(() => StickerPack, (pack) => pack.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'packId', referencedColumnName: 'id' })
  pack: StickerPack;

  /**
   * ID of the sticker
   * Links to stickers table
   */
  @Column({ type: 'bigint', nullable: false })
  stickerId: string;

  /**
   * Sticker information
   * Many-to-One relationship with Sticker entity
   */
  @ManyToOne(() => Sticker, {
    nullable: false,
    onDelete: 'RESTRICT', // Prevent deletion if sticker is in use
  })
  @JoinColumn({ name: 'stickerId', referencedColumnName: 'id' })
  sticker: Sticker;

  /**
   * Sort order within the pack
   * Default: 0
   */
  @Column({ type: 'int', default: 0 })
  sortValue: number;
}
