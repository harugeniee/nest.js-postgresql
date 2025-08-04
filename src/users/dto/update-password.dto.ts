import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class UpdatePasswordDto {
  @IsOptional()
  @IsBoolean()
  logoutFromAllDevices?: boolean;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({
    minLength: 5,
    minNumbers: 1,
    minLowercase: 1,
    minUppercase: 0,
    minSymbols: 0,
  })
  @MaxLength(20)
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @Match('newPassword')
  confirmPassword: string;
}
