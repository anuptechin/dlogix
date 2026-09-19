import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ShipmentDirection,
  ShipmentMode,
  ShipmentPriority,
} from '@prisma/client';

export class DimensionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsNumber()
  @Min(0)
  lengthCm!: number;

  @IsNumber()
  @Min(0)
  widthCm!: number;

  @IsNumber()
  @Min(0)
  heightCm!: number;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class ContainerDto {
  @IsString()
  @MaxLength(40)
  containerType!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estWeightKg?: number;
}

export class CreateEnquiryDto {
  @IsEnum(ShipmentDirection)
  direction!: ShipmentDirection;

  @IsEnum(ShipmentMode)
  mode!: ShipmentMode;

  @IsOptional() @IsUUID() originId?: string;
  @IsOptional() @IsUUID() destinationId?: string;
  @IsOptional() @IsUUID() originIcdCfsId?: string;

  @IsOptional() @IsString() @MaxLength(1000) cargoDesc?: string;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsNumber() @Min(0) volumeCbm?: number;
  @IsOptional() @IsNumber() @Min(0) chargeableWeight?: number;
  @IsOptional() @IsString() @MaxLength(20) incoterm?: string;
  @IsOptional() @IsISO8601() targetDate?: string;
  @IsOptional() @IsISO8601() quoteDeadline?: string;

  // ── parties ──
  @IsOptional() @IsString() @MaxLength(120) businessUnit?: string;
  @IsOptional() @IsString() @MaxLength(120) branchPlant?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() consigneeId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() buyerId?: string;
  @IsOptional() @IsString() @MaxLength(80) salesOrderNo?: string;
  @IsOptional() @IsString() @MaxLength(80) customerPoNo?: string;
  @IsOptional() @IsString() @MaxLength(80) supplierInvoiceNo?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) poNumbers?: string[];

  // ── cargo ──
  @IsOptional() @IsString() @MaxLength(160) commodity?: string;
  @IsOptional() @IsString() @MaxLength(40) hsCode?: string;
  @IsOptional() @IsString() @MaxLength(80) natureOfCargo?: string;
  @IsOptional() @IsString() @MaxLength(80) packageType?: string;
  @IsOptional() @IsInt() @Min(0) packageCount?: number;
  @IsOptional() @IsNumber() @Min(0) netWeightKg?: number;
  @IsOptional() @IsNumber() @Min(0) cargoValue?: number;
  @IsOptional() @IsString() @MaxLength(8) cargoCurrency?: string;
  @IsOptional() @IsEnum(ShipmentPriority) priority?: ShipmentPriority;

  // ── origin/destination detail ──
  @IsOptional() @IsString() @MaxLength(500) pickupAddress?: string;
  @IsOptional() @IsString() @MaxLength(500) deliveryAddress?: string;
  @IsOptional() @IsString() @MaxLength(200) finalDestination?: string;
  @IsOptional() @IsString() @MaxLength(120) stuffingLocation?: string;
  @IsOptional() @IsBoolean() factoryStuffing?: boolean;

  // ── service scope + flags ──
  @IsOptional() @IsString() @MaxLength(60) serviceScope?: string;
  @IsOptional() @IsObject() serviceOptions?: Record<string, boolean>;

  // ── shipping requirements ──
  @IsOptional() @IsString() @MaxLength(120) preferredShippingLine?: string;
  @IsOptional() @IsString() @MaxLength(120) preferredVessel?: string;
  @IsOptional() @IsBoolean() directServiceOnly?: boolean;
  @IsOptional() @IsBoolean() transshipmentAllowed?: boolean;
  @IsOptional() @IsInt() @Min(0) maxTransitDays?: number;
  @IsOptional() @IsISO8601() etdRequired?: string;
  @IsOptional() @IsISO8601() etaRequired?: string;

  // ── quote submission ──
  @IsOptional() @IsISO8601() quoteValidityDate?: string;
  @IsOptional() @IsISO8601() sailingRequiredBefore?: string;

  // ── incoterm details + remarks ──
  @IsOptional() @IsObject() incotermDetails?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(2000) specialInstructions?: string;
  @IsOptional() @IsString() @MaxLength(2000) internalRemarks?: string;

  // ── children ──
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionDto)
  dimensions?: DimensionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDto)
  containers?: ContainerDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  requiredChargeTypeIds?: string[];
}
