import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(USER_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTANTS.PHONE_MAX_LENGTH)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTANTS.PASSWORD_MAX_LENGTH)
  password?: string;
}
