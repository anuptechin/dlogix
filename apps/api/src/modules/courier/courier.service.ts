import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourierSurchargeType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveContractDto } from './dto/save-contract.dto';
import { CalculateDto } from './dto/calculate.dto';

const VOLUMETRIC_DIVISOR = 5000; // cm³ per kg (courier standard)
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const contractInclude = {
  vendor: { select: { id: true, name: true } },
  slabs: { orderBy: [{ destinationZone: 'asc' as const }, { weightFromKg: 'asc' as const }] },
  surcharges: true,
  transits: { orderBy: { destinationZone: 'asc' as const } },
} satisfies Prisma.CourierContractInclude;

@Injectable()
export class CourierService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { activeOnly?: boolean }) {
    return this.prisma.courierContract.findMany({
      where: params.activeOnly ? { isActive: true } : undefined,
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { slabs: true, transits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.courierContract.findUnique({
      where: { id },
      include: contractInclude,
    });
    if (!c) throw new NotFoundException(`Courier contract ${id} not found`);
    return c;
  }

  create(dto: SaveContractDto) {
    return this.prisma.courierContract.create({
      data: this.contractData(dto),
      include: contractInclude,
    });
  }

  async update(id: string, dto: SaveContractDto) {
    await this.findOne(id);
    const data = this.contractData(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.courierRateSlab.deleteMany({ where: { contractId: id } });
      await tx.courierSurcharge.deleteMany({ where: { contractId: id } });
      await tx.courierTransit.deleteMany({ where: { contractId: id } });
      return tx.courierContract.update({
        where: { id },
        data,
        include: contractInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courierContract.delete({ where: { id } });
    return { deleted: true };
  }

  /** Distinct destination zones defined on a contract (for the calculator). */
  async zones(id: string) {
    const c = await this.findOne(id);
    return [...new Set(c.slabs.map((s) => s.destinationZone))].sort();
  }

  async calculate(dto: CalculateDto) {
    const contract = await this.findOne(dto.contractId);

    const volumetric =
      dto.lengthCm && dto.widthCm && dto.heightCm
        ? (dto.lengthCm * dto.widthCm * dto.heightCm) / VOLUMETRIC_DIVISOR
        : 0;
    const chargeableWeight = round2(Math.max(dto.weightKg, volumetric));

    const result = computeCourierCost(contract, dto.destinationZone, chargeableWeight);
    if (!result) {
      throw new BadRequestException(
        `No rate slab covers zone "${dto.destinationZone}" on this contract.`,
      );
    }

    return {
      contract: {
        id: contract.id,
        serviceName: contract.serviceName,
        vendor: contract.vendor.name,
        currency: contract.currency,
      },
      destinationZone: dto.destinationZone,
      actualWeight: dto.weightKg,
      volumetricWeight: round2(volumetric),
      chargeableWeight,
      ...result,
    };
  }

  // ─── helpers ───────────────────────────────────────────────

  private contractData(dto: SaveContractDto): Prisma.CourierContractCreateInput {
    return {
      vendor: { connect: { id: dto.vendorId } },
      serviceName: dto.serviceName,
      direction: dto.direction,
      currency: dto.currency ?? 'INR',
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      isActive: dto.isActive ?? true,
      notes: dto.notes ?? null,
      slabs: {
        create: dto.slabs.map((s) => ({
          destinationZone: s.destinationZone,
          weightFromKg: s.weightFromKg,
          weightToKg: s.weightToKg,
          ratePerKg: s.ratePerKg ?? null,
          flatRate: s.flatRate ?? null,
          minCharge: s.minCharge ?? null,
        })),
      },
      surcharges: {
        create: dto.surcharges.map((s) => ({
          type: s.type,
          label: s.label,
          value: s.value,
          isPercentage: s.isPercentage ?? false,
        })),
      },
      transits: {
        create: dto.transits.map((t) => ({
          destinationZone: t.destinationZone,
          transitDays: t.transitDays,
        })),
      },
    };
  }
}

// ─── Reusable cost engine (also used by Air-vs-Courier compare) ──

export type CourierCostContract = Prisma.CourierContractGetPayload<{
  include: {
    slabs: true;
    surcharges: true;
    transits: true;
  };
}>;

export interface CourierCostResult {
  currency: string;
  base: number;
  surcharges: { label: string; type: CourierSurchargeType; amount: number }[];
  total: number;
  transitDays: number | null;
  slabMatched: boolean;
}

export function computeCourierCost(
  contract: CourierCostContract,
  zone: string,
  chargeableWeight: number,
): CourierCostResult | null {
  const zoneSlabs = contract.slabs
    .filter((s) => s.destinationZone === zone)
    .sort((a, b) => Number(a.weightFromKg) - Number(b.weightFromKg));
  if (zoneSlabs.length === 0) return null;

  // Slab covering the weight; else clamp to nearest (forgiving for over/under).
  let slab =
    zoneSlabs.find(
      (s) =>
        chargeableWeight >= Number(s.weightFromKg) &&
        chargeableWeight <= Number(s.weightToKg),
    ) ?? null;
  if (!slab) {
    slab =
      chargeableWeight < Number(zoneSlabs[0].weightFromKg)
        ? zoneSlabs[0]
        : zoneSlabs[zoneSlabs.length - 1];
  }

  let base =
    slab.flatRate != null
      ? Number(slab.flatRate)
      : Number(slab.ratePerKg ?? 0) * chargeableWeight;
  if (slab.minCharge != null) base = Math.max(base, Number(slab.minCharge));
  base = round2(base);

  const surcharges = contract.surcharges.map((s) => ({
    label: s.label,
    type: s.type,
    amount: round2(
      s.isPercentage ? (base * Number(s.value)) / 100 : Number(s.value),
    ),
  }));

  const total = round2(
    base + surcharges.reduce((sum, s) => sum + s.amount, 0),
  );
  const transit = contract.transits.find((t) => t.destinationZone === zone);

  return {
    currency: contract.currency,
    base,
    surcharges,
    total,
    transitDays: transit?.transitDays ?? null,
    slabMatched: true,
  };
}
