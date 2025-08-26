import { instanceToPlain } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { FILE_CONSTANTS, FileStatus, FileType } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';

@Entity({
  name: 'files',
})
export class File extends BaseEntityCustom {
  @Index()
  @Column({
    type: 'enum',
    enum: FILE_CONSTANTS.STATUS,
    default: FILE_CONSTANTS.STATUS.INACTIVATE,
  })
  status: FileStatus;

  @Column({
    type: 'varchar',
    length: FILE_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  path: string;

  @Column({
    type: 'varchar',
    length: FILE_CONSTANTS.MIME_TYPE_MAX_LENGTH,
    nullable: true,
  })
  mimeType: string;

  @Column({
    type: 'varchar',
    length: FILE_CONSTANTS.EXTENSION_MAX_LENGTH,
    nullable: true,
  })
  extension: string;

  @Column('bigint', { nullable: true })
  size: number;

  @Column({
    type: 'varchar',
    length: FILE_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description: string;

  @Column({
    type: 'enum',
    enum: FILE_CONSTANTS.TYPES,
    default: FILE_CONSTANTS.TYPES.OTHER,
  })
  type: FileType;

  @Column('text', { nullable: true })
  url: string;

  @Column('text', { nullable: true })
  key: string;

  @Column('text', { nullable: true })
  originalName: string;

  @Column('bigint', { nullable: true, default: null })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @Column('text', { nullable: true })
  metadata: string; // JSON string for additional file metadata

  toJSON() {
    const result = instanceToPlain(this);
    // Remove sensitive fields from JSON response
    delete result.key;
    delete result.path;
    delete result.originalName;
    delete result.userId;
    delete result.metadata;
    return result;
  }
}
