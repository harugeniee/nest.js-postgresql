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

export abstract class BaseEntityCustom extends BaseEntity {
  // Snowflake ID
  @PrimaryColumn('bigint')
  id: string;

  @Index('uuid', { unique: true })
  @Column('uuid', { nullable: false, generated: 'uuid' })
  uuid: string;

  @Index()
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @VersionColumn()
  version: number;

  @BeforeInsert()
  generateId() {
    this.id = globalSnowflake.nextId().toString();
  }

  toJSON() {
    return instanceToPlain(this);
  }
}
