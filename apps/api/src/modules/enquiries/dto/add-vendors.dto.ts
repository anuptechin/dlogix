import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AddVendorsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  vendorIds!: string[];
}
