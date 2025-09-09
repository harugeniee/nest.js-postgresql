import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for verifying OTP login
 * Used when user submits OTP code for verification
 */
export class OtpVerifyDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH, {
    message: `Email must not exceed ${USER_CONSTANTS.EMAIL_MAX_LENGTH} characters`,
  })
  email: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  code: string;

  @IsOptional()
  @IsString({ message: 'Request ID must be a string' })
  requestId?: string;
}
