import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.prisma.portLocation.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }
}
