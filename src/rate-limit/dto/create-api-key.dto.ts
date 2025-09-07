import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO for creating a new API key
 */
export class CreateApiKeyDto {
  @IsString()
  key!: string;

  @IsString()
  planId!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsBoolean()
  @IsOptional()
  isWhitelist?: boolean = false;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
