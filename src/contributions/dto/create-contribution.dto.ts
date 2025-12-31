import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CONTRIBUTION_CONSTANTS } from 'src/shared/constants/contribution.constants';

/**
 * DTO for creating a new contribution
 * Represents a user's request to create or update an entity
 */
export class CreateContributionDto {
  /**
   * Type of entity being contributed
   * Must be one of: 'series', 'segment', 'character', 'staff'
   */
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(CONTRIBUTION_CONSTANTS.ENTITY_TYPE))
  entityType: string;

  /**
   * ID of the entity to update (required for 'update' action, null for 'create')
   * Must be provided when action is 'update'
   */
  @ValidateIf((o) => o.action === CONTRIBUTION_CONSTANTS.ACTION.UPDATE)
  @IsNotEmpty({ message: 'entityId is required when action is update' })
  @IsString()
  entityId?: string;

  /**
   * Type of action: 'create' or 'update'
   */
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(CONTRIBUTION_CONSTANTS.ACTION))
  action: string;

  /**
   * Proposed data changes
   * Contains the complete data structure that will be applied if approved
   */
  @IsNotEmpty()
  @IsObject()
  proposedData: Record<string, unknown>;

  /**
   * Optional note from the contributor
   * Allows contributors to provide context or explanation for their changes
   */
  @IsOptional()
  @IsString()
  @MaxLength(CONTRIBUTION_CONSTANTS.CONTRIBUTOR_NOTE_MAX_LENGTH)
  contributorNote?: string;
}
