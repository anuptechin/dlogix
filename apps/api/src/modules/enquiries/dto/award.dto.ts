import { IsArray, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AwardDto {
  @IsUUID()
  quotationId!: string;

  // Which shipping-line option of that quote to award (multi-option quotes).
  @IsOptional()
  @IsUUID()
  optionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  // D'Decor internal recipients to notify of the award (all @ddecor.com, etc.).
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  internalEmails?: string[];
}
