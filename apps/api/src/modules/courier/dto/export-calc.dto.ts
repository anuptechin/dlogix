import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourierCarrier } from '@prisma/client';

export class ExportCalcDto {
  @IsEnum(CourierCarrier)
  carrier!: CourierCarrier;

  @IsString()
  country!: string;

  @IsIn(['cm', 'in'])
  unit!: 'cm' | 'in';

  @IsOptional() @IsNumber() @Min(0) lengthCm?: number;
  @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @IsOptional() @IsNumber() @Min(0) heightCm?: number;
  @IsOptional() @IsNumber() @Min(0) actualWeightKg?: number;
}
