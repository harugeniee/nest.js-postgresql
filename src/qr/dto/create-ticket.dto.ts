import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { QR_ACTION_TYPES, QrActionType } from 'src/shared/constants';

/**
 * DTO for creating a new QR ticket
 * This DTO is used when a web client requests to create a QR code for a specific action
 */
export class CreateTicketDto {
  /**
   * Type of action this QR ticket represents
   * Must be one of the predefined QrActionType values
   */
  @IsEnum(QR_ACTION_TYPES, {
    message: 'Action type must be one of: LOGIN, ADD_FRIEND, JOIN_ORG, PAIR',
  })
  type: QrActionType;

  /**
   * Optional payload data specific to the action type
   * For LOGIN: usually empty or contains session metadata
   * For ADD_FRIEND: may contain friend's user ID or username
   * For JOIN_ORG: may contain organization ID and role
   * For PAIR: may contain device information or public key
   */
  @IsOptional()
  @IsObject({ message: 'Payload must be a valid object' })
  payload?: Record<string, any>;

  /**
   * Optional web session identifier to bind the ticket to a specific browser session
   * This helps with security and session management
   */
  @IsOptional()
  @IsString({ message: 'Web session ID must be a string' })
  @MaxLength(255, { message: 'Web session ID must not exceed 255 characters' })
  webSessionId?: string;
}
