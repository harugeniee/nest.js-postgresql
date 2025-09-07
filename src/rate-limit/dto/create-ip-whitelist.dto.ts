import { IsString, IsOptional, IsBoolean, IsIP } from 'class-validator';

/**
 * DTO for creating a new IP whitelist entry
 */
export class CreateIpWhitelistDto {
  @IsString()
  @IsIP()
  ip!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}
