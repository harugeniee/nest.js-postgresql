import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for Firebase authentication login
 * Used when user wants to login using Firebase ID token
 */
export class FirebaseLoginDto {
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  @IsString({ message: 'Firebase ID token must be a string' })
  idToken: string;
}
