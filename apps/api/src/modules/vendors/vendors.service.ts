import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { q?: string; active?: boolean }) {
    const where: Prisma.VendorWhereInput = {};
    if (params.active !== undefined) where.isActive = params.active;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { email: { contains: params.q, mode: 'insensitive' } },
        { contactPerson: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: { ...dto, modeCapabilities: dto.modeCapabilities ?? [] },
    });
  }

  async update(id: string, dto: UpdateVendorDto) {
    await this.findOne(id); // 404 if missing
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }
}
