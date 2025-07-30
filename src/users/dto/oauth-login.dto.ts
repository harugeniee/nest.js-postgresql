import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

export class OAuthLoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(USER_CONSTANTS.OAUTH_PROVIDER_MAX_LENGTH)
  provider: string; // google, facebook, github, etc.

  @IsNotEmpty()
  @IsString()
  @MaxLength(USER_CONSTANTS.OAUTH_ID_MAX_LENGTH)
  oauthId: string; // Unique ID from OAuth provider

  @IsNotEmpty()
  @IsString()
  @MaxLength(USER_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTANTS.OAUTH_TOKEN_MAX_LENGTH)
  accessToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTANTS.OAUTH_TOKEN_MAX_LENGTH)
  refreshToken?: string;
} 