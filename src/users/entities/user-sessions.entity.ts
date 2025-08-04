import { instanceToPlain } from 'class-transformer';
import { AuthType, USER_CONSTANTS } from 'src/shared/constants/user.constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('user_sessions')
@Index(['userId', 'revoked'])
@Index(['expiresAt'])
export class UserSession extends BaseEntityCustom {
  @Column('bigint')
  @Index()
  userId: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'text', nullable: true })
  ipAddress: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
    enum: USER_CONSTANTS.AUTH_TYPES,
    default: USER_CONSTANTS.AUTH_TYPES.EMAIL_PASSWORD,
  })
  authType: AuthType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  toJSON() {
    const plain = instanceToPlain(this);
    return plain;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.revoked && !this.isExpired();
  }

  revoke(): void {
    this.revoked = true;
  }

  isActive(): boolean {
    return !this.revoked;
  }
}
