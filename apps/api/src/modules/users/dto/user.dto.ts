import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString() @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) @MaxLength(72) password?: string;
}
