import { BadRequestException, PipeTransform } from '@nestjs/common';

/**
 * SnowflakeIdPipe validates that the id is a numeric string within expected length bounds.
 * It preserves the value as string to avoid precision loss beyond Number.MAX_SAFE_INTEGER.
 */
export class SnowflakeIdPipe implements PipeTransform<string> {
  transform(value: string): string {
    const isValid = /^\d{15,21}$/.test(value);
    if (!isValid) {
      throw new BadRequestException('Invalid snowflake id');
    }
    return value;
  }
}
