import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH)
  email?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(16)
  password?: string;
}
