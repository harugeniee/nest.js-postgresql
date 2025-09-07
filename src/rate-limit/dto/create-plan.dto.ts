import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for creating a new rate limit plan
 */
export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(1)
  @Max(100000)
  limitPerMin!: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3600)
  ttlSec?: number = 60;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(0)
  displayOrder?: number = 0;
}
