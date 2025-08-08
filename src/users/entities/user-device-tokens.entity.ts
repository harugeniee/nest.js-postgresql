import { instanceToPlain } from 'class-transformer';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('user_device_tokens')
export class UserDeviceToken extends BaseEntityCustom {
  @Column('bigint')
  @Index()
  userId: string;

  @Column('bigint')
  @Index()
  sessionId: string;

  @Column({ type: 'text', nullable: true })
  token: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255, default: null })
  deviceId: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  deviceType: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 20,
    default: 'firebase',
  })
  provider: string; // firebase, apns, fcm, etc.

  @Column({ type: 'text', nullable: true })
  appVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  toJSON() {
    const plain = instanceToPlain(this);
    return plain;
  }
}
