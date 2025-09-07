import { PartialType } from '@nestjs/mapped-types';
import { CreateApiKeyDto } from './create-api-key.dto';

/**
 * DTO for updating an API key
 */
export class UpdateApiKeyDto extends PartialType(CreateApiKeyDto) {}
