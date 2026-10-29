import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RateType } from '@prisma/client';

export class QuotationLineDto {
  @IsOptional()
  @IsUUID()
  chargeTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsNumber()
  @Min(0)
  rate!: number;
}

// One shipping/air-line option: its own schedule + charge lines.
export class QuotationOptionDto {
  @IsOptional() @IsString() @MaxLength(120) label?: string;
  @IsOptional() @IsString() @MaxLength(120) shippingLine?: string;
  @IsOptional() @IsString() @MaxLength(120) vesselName?: string;
  @IsOptional() @IsISO8601() etd?: string;
  @IsOptional() @IsISO8601() eta?: string;
  @IsOptional() @IsInt() @Min(0) transitTimeDays?: number;
  @IsOptional() @IsInt() @Min(0) transshipments?: number;
  @IsOptional() @IsEnum(RateType) rateType?: RateType;
  @IsOptional() @IsInt() @Min(0) freeDetentionOriginDays?: number;
  @IsOptional() @IsInt() @Min(0) freeDetentionDestDays?: number;
  @IsOptional() @IsInt() @Min(0) freeDemurrageDestDays?: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineDto)
  lines!: QuotationLineDto[];
}

export class SaveQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  transitTimeDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  // Legacy single-set lines (non-option modes).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineDto)
  lines?: QuotationLineDto[];

  // Multi-option flow (Export Sea/Air): several shipping-line options.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuotationOptionDto)
  options?: QuotationOptionDto[];

  // ── Legacy schedule fields (non-option modes) ──
  @IsOptional() @IsEnum(RateType) rateType?: RateType;
  @IsOptional() @IsInt() @Min(0) freeDetentionOriginDays?: number;
  @IsOptional() @IsInt() @Min(0) freeDetentionDestDays?: number;
  @IsOptional() @IsInt() @Min(0) freeDemurrageDestDays?: number;
  @IsOptional() @IsISO8601() etd?: string;
  @IsOptional() @IsISO8601() eta?: string;
  @IsOptional() @IsInt() @Min(0) transshipments?: number;
  @IsOptional() @IsString() @MaxLength(120) shippingLine?: string;
  @IsOptional() @IsString() @MaxLength(120) vesselName?: string;
}
