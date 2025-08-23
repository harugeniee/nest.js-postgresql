import { IsString, Length, Matches } from 'class-validator';

/**
 * DTO for approving a QR ticket
 * This DTO is used when a mobile user approves an action after scanning the QR code
 * The codeVerifier is used for PKCE (Proof Key for Code Exchange) validation
 */
export class ApproveTicketDto {
  /**
   * PKCE code verifier - a random string that was used to generate the code challenge
   * This must match the code challenge stored with the ticket for security validation
   *
   * Format: base64url encoded string (A-Z, a-z, 0-9, -, _)
   * Length: typically 32-128 characters
   */
  @IsString({ message: 'Code verifier must be a string' })
  @Length(32, 128, {
    message: 'Code verifier must be between 32 and 128 characters',
  })
  @Matches(/^[A-Za-z0-9\-_]+$/, {
    message:
      'Code verifier must contain only base64url characters (A-Z, a-z, 0-9, -, _)',
  })
  codeVerifier: string;
}
