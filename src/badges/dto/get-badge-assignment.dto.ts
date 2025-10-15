// Swagger removed
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { BadgeAssignmentStatus, BadgeEntityType } from 'src/shared/constants';

/**
 * DTO for querying badge assignments with filters and pagination
 */
export class GetBadgeAssignmentDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  badgeId?: string;

  @IsOptional()
  @IsEnum(BadgeEntityType)
  entityType?: BadgeEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(BadgeAssignmentStatus, { each: true })
  statuses?: BadgeAssignmentStatus[];

  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isManuallyRevokable?: boolean;

  @IsOptional()
  @IsString()
  assignedBy?: string;

  @IsOptional()
  @IsString()
  revokedBy?: string;

  @IsOptional()
  @IsString()
  assignedFrom?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  expiresFrom?: string;

  @IsOptional()
  @IsString()
  expiresTo?: string;

  @IsOptional()
  @IsString()
  revokedFrom?: string;

  @IsOptional()
  @IsString()
  revokedTo?: string;
}
