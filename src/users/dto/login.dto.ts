import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH)
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
