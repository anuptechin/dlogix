import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourierSurchargeType, ShipmentDirection } from '@prisma/client';

export class SlabDto {
  @IsString() @MaxLength(80) destinationZone!: string;
  @IsNumber() @Min(0) weightFromKg!: number;
  @IsNumber() @Min(0) weightToKg!: number;
  @IsOptional() @IsNumber() @Min(0) ratePerKg?: number;
  @IsOptional() @IsNumber() @Min(0) flatRate?: number;
  @IsOptional() @IsNumber() @Min(0) minCharge?: number;
}

export class SurchargeDto {
  @IsEnum(CourierSurchargeType) type!: CourierSurchargeType;
  @IsString() @MaxLength(80) label!: string;
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsBoolean() isPercentage?: boolean;
}

export class TransitDto {
  @IsString() @MaxLength(80) destinationZone!: string;
  @IsInt() @Min(0) transitDays!: number;
}

export class SaveContractDto {
  @IsUUID() vendorId!: string;
  @IsString() @MaxLength(120) serviceName!: string;
  @IsEnum(ShipmentDirection) direction!: ShipmentDirection;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsISO8601() validFrom?: string;
  @IsOptional() @IsISO8601() validTo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => SlabDto)
  slabs!: SlabDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => SurchargeDto)
  surcharges!: SurchargeDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TransitDto)
  transits!: TransitDto[];
}
