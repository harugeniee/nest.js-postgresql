import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDeviceTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  deviceType: string;

  @IsNotEmpty()
  @IsString()
  provider: string;
}
