import { PartialType } from '@nestjs/mapped-types';
import { CreateBadgeDto } from './create-badge.dto';

/**
 * DTO for updating an existing badge
 * All fields are optional as it extends PartialType of CreateBadgeDto
 */
export class UpdateBadgeDto extends PartialType(CreateBadgeDto) {
  // Additional update-specific fields can be added here if needed
  // For example, fields that should not be updated during creation
}
