import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Article } from 'src/articles/entities/article.entity';
import { ShareChannel } from './share-channel.entity';
import { Campaign } from './campaign.entity';
// import { ShareSession } from './share-session.entity';
// import { ShareClick } from './share-click.entity';
// import { ShareAttribution } from './share-attribution.entity';
// import { ShareConversion } from './share-conversion.entity';
// import { ShareAggDaily } from './share-agg-daily.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  // OneToMany,
} from 'typeorm';
import { Media } from 'src/media/entities/media.entity';
import { Comment } from 'src/comments/entities/comment.entity';
import { BookmarkFolder } from 'src/bookmarks/entities/bookmark-folder.entity';
import { StickerPack } from 'src/stickers/entities/sticker-pack.entity';

/**
 * Share link entity for tracking shared content
 *
 * Features:
 * - Unique short codes for share links
 * - Polymorphic relationship to different content types (posts, users, media, etc.)
 * - Optional channel and campaign categorization
 * - One-to-many relationships with sessions, clicks, attributions, conversions, and daily aggregations
 */
@Entity({ name: 'share_links' })
@Index(['code'], { unique: true })
@Index(['contentType', 'contentId', 'userId'])
@Index(['channelId'])
@Index(['campaignId'])
@Index(['isActive'])
export class ShareLink extends BaseEntityCustom {
  /**
   * Unique short code for the share link
   * Used in URLs like /s/:code
   * Must be unique across all share links
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    comment: 'Unique short code for the share link',
  })
  code: string;

  /**
   * Type of content being shared
   * Examples: 'article', 'user', 'media', 'comment', 'bookmark_folder'
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Type of content being shared',
  })
  contentType: string;

  /**
   * Foreign key reference to the content being shared
   * Maps to different tables based on contentType
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to the content being shared',
  })
  contentId: string;

  /**
   * Polymorphic relationship to different content types
   * This will be populated based on contentType
   */
  content?:
    | Article
    | User
    | Media
    | Comment
    | BookmarkFolder
    | StickerPack
    | null;

  /**
   * Foreign key reference to the user who created this share link
   * Maps to users.id
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Optional foreign key reference to share channel
   * Maps to share_channels.id
   */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'Optional foreign key reference to share_channels.id',
  })
  channelId?: string;

  @ManyToOne(() => ShareChannel, { nullable: true })
  @JoinColumn({ name: 'channelId', referencedColumnName: 'id' })
  channel?: ShareChannel;

  /**
   * Optional foreign key reference to campaign
   * Maps to campaigns.id
   */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'Optional foreign key reference to campaigns.id',
  })
  campaignId?: string;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId', referencedColumnName: 'id' })
  campaign?: Campaign;

  /**
   * Optional note or description for this share link
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Optional note or description for this share link',
  })
  note?: string;

  /**
   * Whether this share link is active
   * Defaults to true for new share links
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this share link is active',
  })
  isActive: boolean;

  /**
   * One-to-many relationship with share sessions
   * A share link can have multiple sessions
   */
  // @OneToMany(() => ShareSession, (session) => session.shareLink, {
  //   cascade: false,
  //   eager: false,
  // })
  // sessions?: ShareSession[];

  /**
   * One-to-many relationship with share clicks
   * A share link can have multiple clicks
   */
  // @OneToMany(() => ShareClick, (click) => click.shareLink, {
  //   cascade: false,
  //   eager: false,
  // })
  // clicks?: ShareClick[];

  /**
   * One-to-many relationship with share attributions
   * A share link can have multiple attributions
   */
  // @OneToMany(() => ShareAttribution, (attribution) => attribution.shareLink, {
  //   cascade: false,
  //   eager: false,
  // })
  // attributions?: ShareAttribution[];

  /**
   * One-to-many relationship with share conversions
   * A share link can have multiple conversions
   */
  // @OneToMany(() => ShareConversion, (conversion) => conversion.shareLink, {
  //   cascade: false,
  //   eager: false,
  // })
  // conversions?: ShareConversion[];

  /**
   * One-to-many relationship with daily aggregations
   * A share link can have multiple daily aggregations
   */
  // @OneToMany(() => ShareAggDaily, (agg) => agg.shareLink, {
  //   cascade: false,
  //   eager: false,
  // })
  // dailyAggregations?: ShareAggDaily[];
}
