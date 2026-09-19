import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CalculateDto {
  @IsUUID() contractId!: string;
  @IsString() @MaxLength(80) destinationZone!: string;
  @IsNumber() @Min(0) weightKg!: number;

  // Optional dimensions → volumetric weight (L×W×H / divisor).
  @IsOptional() @IsNumber() @Min(0) lengthCm?: number;
  @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @IsOptional() @IsNumber() @Min(0) heightCm?: number;
}
