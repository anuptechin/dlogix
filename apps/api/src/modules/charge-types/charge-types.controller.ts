import { Controller, Get, Query } from '@nestjs/common';
import { ShipmentMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('charge-types')
export class ChargeTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('mode') mode?: ShipmentMode) {
    return this.prisma.chargeType.findMany({
      where: {
        isActive: true,
        ...(mode ? { appliesToMode: { has: mode } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
