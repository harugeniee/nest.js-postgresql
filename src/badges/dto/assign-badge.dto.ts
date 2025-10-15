// Swagger removed
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BadgeEntityType } from 'src/shared/constants';

/**
 * DTO for assigning a badge to an entity
 */
export class AssignBadgeDto {
  @IsString()
  @IsNotEmpty()
  badgeId!: string;

  @IsEnum(BadgeEntityType)
  @IsNotEmpty()
  entityType!: BadgeEntityType;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  assignmentReason?: string;

  @IsOptional()
  isVisible?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
