import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';

/**
 * DTO for updating a rate limit plan
 */
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
