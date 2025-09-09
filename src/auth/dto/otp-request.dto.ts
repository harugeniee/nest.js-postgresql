import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { USER_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for requesting OTP login
 * Used when user wants to login via OTP instead of password
 */
export class OtpRequestDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(USER_CONSTANTS.EMAIL_MAX_LENGTH, {
    message: `Email must not exceed ${USER_CONSTANTS.EMAIL_MAX_LENGTH} characters`,
  })
  email: string;
}
