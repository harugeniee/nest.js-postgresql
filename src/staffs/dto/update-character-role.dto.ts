import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating a character role for a staff member
 * Updates the CharacterStaff junction entity
 */
export class UpdateCharacterRoleDto {
  /**
   * Language of the voice acting
   * Examples: 'Japanese', 'English', 'Korean', 'Spanish'
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  /**
   * Whether this is the primary/main voice actor for this character
   */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /**
   * Sort order for displaying voice actors in lists
   * Lower values appear first
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /**
   * Notes regarding the voice actor's role for the character
   * Examples: "Original Japanese voice", "English dub", "Special appearance"
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
