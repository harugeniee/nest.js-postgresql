import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  SHARE_CONSTANTS,
  ShareContentType,
} from '../constants/share.constants';

export class CreateShareLinkDto {
  /**
   * Type of content being shared
   */
  @IsEnum(SHARE_CONSTANTS.CONTENT_TYPES)
  contentType: ShareContentType;

  /**
   * ID of the content being shared
   */
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  contentId: string;

  /**
   * User ID of the share link owner
   */
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  ownerUserId: string;

  /**
   * Optional channel ID for categorization
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value) : undefined))
  channelId?: string;

  /**
   * Optional campaign ID for categorization
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value) : undefined))
  campaignId?: string;

  /**
   * Optional note or description
   */
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * Whether the share link is active
   * Defaults to true
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
