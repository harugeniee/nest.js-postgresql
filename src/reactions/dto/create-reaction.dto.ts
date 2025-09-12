import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateOrSetReactionDto {
  @IsString()
  subjectType: string;

  @IsString()
  subjectId: string;

  @IsString()
  kind: string;

  @IsOptional()
  @IsIn(['toggle', 'set', 'unset'])
  action?: 'toggle' | 'set' | 'unset' = 'toggle';

  @IsOptional()
  value?: boolean;
}
