import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

// NOTE: RBAC guards (LOGISTICS/ADMIN) to be added with auth (P0-3).
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  list(@Query('q') q?: string, @Query('active') active?: string) {
    const activeBool = active === undefined ? undefined : active === 'true';
    return this.vendors.findAll({ q, active: activeBool });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.vendors.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendors.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendors.update(id, dto);
  }
}
