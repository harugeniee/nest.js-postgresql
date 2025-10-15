// Swagger removed
import { Type } from 'class-transformer';
import {
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';

/**
 * DTO for revoking a badge assignment
 */
export class RevokeBadgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  revocationReason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
