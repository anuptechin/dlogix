import { Controller, Get, Query } from '@nestjs/common';
import { PartyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('masters')
export class MastersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('parties')
  parties(@Query('role') role?: PartyRole) {
    return this.prisma.party.findMany({
      where: {
        isActive: true,
        ...(role ? { roles: { has: role } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('vendor-groups')
  async vendorGroups() {
    const groups = await this.prisma.vendorGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { members: { select: { vendorId: true } } },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      vendorIds: g.members.map((m) => m.vendorId),
    }));
  }

  // Generic dropdown master. Pass ?category=CONTAINER_TYPE etc. to filter.
  @Get('lookups')
  lookups(@Query('category') category?: string) {
    return this.prisma.lookupOption.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  @Get('incoterms')
  incoterms() {
    return this.prisma.incoterm.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
