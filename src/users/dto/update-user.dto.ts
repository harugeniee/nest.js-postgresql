import {
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

// export class UpdateUserDto extends PartialType(RegisterDto) {}
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  username?: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword({
    minLength: 5,
    minNumbers: 1,
  })
  password?: string;
}
