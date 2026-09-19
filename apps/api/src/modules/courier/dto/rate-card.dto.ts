import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { CourierFuelOrder } from '@prisma/client';

// All optional — the config-edit form sends the full set.
export class UpdateRateCardDto {
  @IsOptional() @IsEnum(CourierFuelOrder) fuelOrder?: CourierFuelOrder;
  @IsOptional() @IsInt() @Min(1) volumetricDivisorCm?: number;
  @IsOptional() @IsInt() @Min(1) volumetricDivisorIn?: number;
  @IsOptional() @IsNumber() @Min(0) flatMaxWeightKg?: number;
  @IsOptional() @IsNumber() @Min(0) surchargePerKg?: number;
  @IsOptional() @IsNumber() @Min(0) fuelPct?: number;
  @IsOptional() @IsNumber() @Min(0) gstPct?: number;
  @IsOptional() @IsNumber() @Min(0) marginX?: number;
  @IsOptional() @IsNumber() @Min(0) usdRate?: number;
  @IsOptional() @IsNumber() @Min(0) gbpRate?: number;
  @IsOptional() @IsNumber() @Min(0) eurRate?: number;
}
