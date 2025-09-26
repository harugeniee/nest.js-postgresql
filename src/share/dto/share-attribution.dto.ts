import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class ShareAttributionDto {
  /**
   * Session token from cookie
   */
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  /**
   * User ID of the viewer (if logged in)
   */
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  viewerUserId: string;

  /**
   * Share link ID (added by service)
   */
  shareId?: string;
}

export class ShareConversionDto {
  /**
   * Session token from cookie
   */
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  /**
   * Conversion type
   */
  @IsString()
  @IsNotEmpty()
  convType: string;

  /**
   * Optional conversion value
   */
  @IsOptional()
  @IsNumber()
  convValue?: number;

  /**
   * Optional user ID if logged in
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value) : undefined))
  viewerUserId?: string;

  /**
   * Share link ID (added by service)
   */
  shareId?: string;
}
