import { instanceToPlain, Exclude } from 'class-transformer';
import { Media } from 'src/media/entities/media.entity';
import { USER_CONSTANTS, UserRole, UserStatus } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity({
  name: 'users',
})
@Index(['oauthProvider', 'oauthId'], { unique: true }) // Composite unique index for OAuth
@Index(['status', 'role']) // Composite index for filtering
@Index(['isEmailVerified', 'isPhoneVerified']) // Composite index for verification
export class User extends BaseEntityCustom {
  @Column({
    type: 'varchar',
    length: USER_CONSTANTS.NAME_MAX_LENGTH,
    nullable: true,
    default: null,
  })
  name: string;

  @Index({ unique: true }) // Unique index for username
  @Column({
    type: 'varchar',
    length: USER_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  username: string;

  @Index() // Index for status filtering
  @Column({
    type: 'varchar',
    nullable: false,
    enum: USER_CONSTANTS.STATUS,
    default: USER_CONSTANTS.STATUS.ACTIVE,
  })
  status: UserStatus;

  @Index() // Index for role filtering
  @Column({
    type: 'varchar',
    nullable: false,
    enum: USER_CONSTANTS.ROLES,
    default: USER_CONSTANTS.ROLES.USER,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    length: USER_CONSTANTS.EMAIL_MAX_LENGTH,
    nullable: true,
  })
  email: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  dob: Date;

  @Index() // Index for phone search (optional)
  @Column('varchar', {
    length: USER_CONSTANTS.PHONE_MAX_LENGTH,
    nullable: true,
  })
  phoneNumber: string;

  @Exclude()
  @Column('varchar', {
    length: USER_CONSTANTS.PASSWORD_MAX_LENGTH,
    nullable: true,
  })
  password: string;

  // OAuth related fields
  @Column('varchar', {
    length: USER_CONSTANTS.OAUTH_PROVIDER_MAX_LENGTH,
    nullable: true,
  })
  oauthProvider: string; // google, facebook, github, etc.

  @Column('varchar', {
    length: USER_CONSTANTS.OAUTH_ID_MAX_LENGTH,
    nullable: true,
  })
  oauthId: string; // Unique ID from OAuth provider

  @Index() // Index for auth method filtering
  @Column('varchar', {
    length: USER_CONSTANTS.AUTH_METHOD_MAX_LENGTH,
    nullable: false,
    default: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
  })
  authMethod: string; // email_password, oauth, phone_otp

  @Index() // Index for email verification filtering
  @Column('boolean', {
    default: false,
  })
  isEmailVerified: boolean;

  @Index() // Index for phone verification filtering
  @Column('boolean', {
    default: false,
  })
  isPhoneVerified: boolean;

  @Column('bigint', {
    nullable: true,
  })
  avatarId: string;

  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'avatarId', referencedColumnName: 'id' })
  avatar: Media; // Avatar media

  toJSON() {
    const result = instanceToPlain(this);
    delete result.password;
    delete result.uuid;
    return result;
  }
}
