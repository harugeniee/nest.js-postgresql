import { IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { MediaType, MEDIA_CONSTANTS } from 'src/shared/constants';
import { AdvancedPaginationDto } from 'src/common/dto';

export class MediaQueryDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsEnum(MEDIA_CONSTANTS.TYPES)
  type?: MediaType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  minSize?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  maxSize?: number;
}
