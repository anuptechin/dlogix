import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AwardDto {
  @IsUUID()
  quotationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
