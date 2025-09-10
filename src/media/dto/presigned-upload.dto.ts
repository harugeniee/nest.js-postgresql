import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignedUploadDto {
  @ApiProperty({
    description: 'Filename for the upload',
    example: 'profile-picture.jpg',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  contentType: string;

  @ApiPropertyOptional({
    description: 'Content length of the file in bytes',
    example: 1024000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  contentLength?: number;
}
