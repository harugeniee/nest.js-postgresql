import { PartialType } from '@nestjs/mapped-types';
import { CreateIpWhitelistDto } from './create-ip-whitelist.dto';

/**
 * DTO for updating an IP whitelist entry
 */
export class UpdateIpWhitelistDto extends PartialType(CreateIpWhitelistDto) {}
