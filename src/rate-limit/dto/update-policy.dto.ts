import { PartialType } from '@nestjs/mapped-types';
import { CreatePolicyDto } from './create-policy.dto';

/**
 * DTO for updating a rate limit policy
 */
export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {}
