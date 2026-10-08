import { IsArray, IsEmail, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EmailQuoteDto {
  @IsEmail()
  to!: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsString()
  country!: string;

  @IsIn(['cm', 'in'])
  unit!: 'cm' | 'in';

  @IsOptional() @IsNumber() @Min(0) lengthCm?: number;
  @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @IsOptional() @IsNumber() @Min(0) heightCm?: number;
  @IsOptional() @IsNumber() @Min(0) actualWeightKg?: number;
  @IsOptional() @IsNumber() @Min(1) boxes?: number;
}
