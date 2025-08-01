import {
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsString()
  ipAddress: string;

  @IsOptional()
  @IsString()
  userAgent: string;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
