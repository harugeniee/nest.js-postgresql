import { instanceToPlain } from 'class-transformer';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { USER_CONSTANTS, UserRole, UserStatus } from 'src/shared/constants';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column } from 'typeorm';

@Entity('users')
@Index(['oauthProvider', 'oauthId'], { unique: true }) // Composite unique index cho OAuth
@Index(['status', 'role']) // Composite index cho filtering
@Index(['isEmailVerified', 'isPhoneVerified']) // Composite index cho verification
export class User extends BaseEntityCustom {
  @Column({
    type: 'varchar',
    length: USER_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  @Index({ unique: true }) // Unique index cho username
  @Column({
    type: 'varchar',
    length: USER_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  username: string;

  @Index() // Index cho status filtering
  @Column({
    type: 'varchar',
    nullable: false,
    enum: USER_CONSTANTS.STATUS,
    default: USER_CONSTANTS.STATUS.ACTIVE,
  })
  status: UserStatus;

  @Index() // Index cho role filtering
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
    unique: true,
  })
  email: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  dob: Date;

  @Index() // Index cho phone search (optional)
  @Column('varchar', {
    length: USER_CONSTANTS.PHONE_MAX_LENGTH,
    nullable: true,
  })
  phoneNumber: string;

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

  @Index() // Index cho auth method filtering
  @Column('varchar', {
    length: USER_CONSTANTS.AUTH_METHOD_MAX_LENGTH,
    nullable: false,
    default: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
  })
  authMethod: string; // email_password, oauth, phone_otp

  @Index() // Index cho email verification filtering
  @Column('boolean', {
    default: false,
  })
  isEmailVerified: boolean;

  @Index() // Index cho phone verification filtering
  @Column('boolean', {
    default: false,
  })
  isPhoneVerified: boolean;

  toJSON() {
    const result = instanceToPlain(this);
    delete result.password;
    return result;
  }
}
