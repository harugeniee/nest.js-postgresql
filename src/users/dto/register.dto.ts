import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH)
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({
    minLength: 5,
    minNumbers: 1,
    minLowercase: 1,
    minUppercase: 0,
    minSymbols: 0,
  })
  @MaxLength(16)
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  username: string;
}
