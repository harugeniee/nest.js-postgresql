// Swagger removed
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { BadgeAssignmentStatus, BadgeEntityType } from 'src/shared/constants';

/**
 * DTO for querying badge assignments with filters and pagination
 */
export class GetBadgeAssignmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

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
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
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

  @IsOptional()
  @IsString()
  sortBy?: string = 'assignedAt';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';
}
