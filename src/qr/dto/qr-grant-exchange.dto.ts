import { IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * DTO for QR grant exchange
 * Supports both legacy grantToken and new deliveryCode methods
 */
export class QrGrantExchangeDto {
  /** The ticket ID */
  @IsString()
  tid: string;

  /** Legacy grant token (mutually exclusive with deliveryCode) */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.deliveryCode)
  grantToken?: string;

  /** New delivery code for polling-based exchange (mutually exclusive with grantToken) */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.grantToken)
  deliveryCode?: string;
}
