import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PresignedDownloadQueryDto {
  @ApiPropertyOptional({
    description: 'Expiry time for the presigned URL in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(60) // Minimum 1 minute
  @Max(86400) // Maximum 24 hours
  expiresIn?: number = 3600; // Default 1 hour
}
