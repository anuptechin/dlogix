import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourierCarrier, CourierFuelOrder, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseRateCardWorkbook } from './rate-card-import';
import { UpdateRateCardDto } from './dto/rate-card.dto';
import { ExportCalcDto } from './dto/export-calc.dto';

const LB_TO_KG = 0.45359237;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (d: Prisma.Decimal | number) => Number(d);

// Per-carrier defaults seeded from the D'Decor sheet on first import.
const DEFAULTS: Record<CourierCarrier, Partial<Prisma.CourierRateCardCreateInput>> = {
  // DHL sheet: (rate + 150) × 1.30
  DHL: { surchargePerKg: 150, fuelPct: 0.3, marginX: 2, fuelOrder: CourierFuelOrder.SURCHARGE_THEN_FUEL },
  // FedEx sheet: rate × 1.50 + 135
  FEDEX: { surchargePerKg: 135, fuelPct: 0.5, marginX: 2, fuelOrder: CourierFuelOrder.FUEL_THEN_SURCHARGE },
};

@Injectable()
export class ExportCourierService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parse an uploaded workbook and (re)load DHL + FedEx zone lists & price matrices. */
  async importWorkbook(buffer: Buffer) {
    const cards = await parseRateCardWorkbook(buffer);
    if (!cards.length) {
      throw new BadRequestException(
        'No DHL/FedEx sheets found. Expected sheets: DHL ZONE LIST, DHL PRICES, FEDEX ZONE LIST, FEDEX PRICE.',
      );
    }
    const summary: {
      carrier: string;
      zones: number;
      rateRows: number;
      countries: number;
    }[] = [];

    for (const parsed of cards) {
      if (!parsed.zones.length || !parsed.rates.length) continue;
      await this.prisma.$transaction(
        async (tx) => {
          const card = await tx.courierRateCard.upsert({
            where: { carrier: parsed.carrier },
            // Preserve edited config on re-import; only refresh structural flatMax.
            update: { flatMaxWeightKg: parsed.flatMaxWeightKg },
            create: {
              carrier: parsed.carrier,
              flatMaxWeightKg: parsed.flatMaxWeightKg,
              ...DEFAULTS[parsed.carrier],
            },
          });
          await tx.courierZone.deleteMany({ where: { rateCardId: card.id } });
          await tx.courierRateRow.deleteMany({ where: { rateCardId: card.id } });
          await tx.courierZone.createMany({
            data: parsed.zones.map((z) => ({
              rateCardId: card.id,
              country: z.country,
              zone: z.zone,
            })),
          });
          await tx.courierRateRow.createMany({
            data: parsed.rates.map((rt) => ({
              rateCardId: card.id,
              weightKg: rt.weightKg,
              zone: rt.zone,
              price: rt.price,
              perKg: rt.perKg,
            })),
          });
        },
        { timeout: 30000 },
      );
      summary.push({
        carrier: parsed.carrier,
        zones: new Set(parsed.rates.map((r) => r.zone)).size,
        rateRows: parsed.rates.length,
        countries: parsed.zones.length,
      });
    }
    return { imported: summary };
  }

  async listCards() {
    const cards = await this.prisma.courierRateCard.findMany({
      orderBy: { carrier: 'asc' },
      include: { _count: { select: { zones: true, rates: true } } },
    });
    return cards.map((c) => this.publicCard(c));
  }

  async getCard(carrier: CourierCarrier) {
    const c = await this.prisma.courierRateCard.findUnique({
      where: { carrier },
      include: { _count: { select: { zones: true, rates: true } } },
    });
    if (!c) throw new NotFoundException(`No rate card for ${carrier}. Import the workbook first.`);
    return this.publicCard(c);
  }

  async updateConfig(carrier: CourierCarrier, dto: UpdateRateCardDto) {
    await this.getCard(carrier);
    const c = await this.prisma.courierRateCard.update({
      where: { carrier },
      data: {
        volumetricDivisorCm: dto.volumetricDivisorCm,
        volumetricDivisorIn: dto.volumetricDivisorIn,
        flatMaxWeightKg: dto.flatMaxWeightKg,
        surchargePerKg: dto.surchargePerKg,
        fuelPct: dto.fuelPct,
        fuelOrder: dto.fuelOrder,
        gstPct: dto.gstPct,
        marginX: dto.marginX,
        usdRate: dto.usdRate,
        gbpRate: dto.gbpRate,
        eurRate: dto.eurRate,
      },
      include: { _count: { select: { zones: true, rates: true } } },
    });
    return this.publicCard(c);
  }

  async countries(carrier: CourierCarrier) {
    const rows = await this.prisma.courierZone.findMany({
      where: { rateCard: { carrier } },
      select: { country: true, zone: true },
      orderBy: { country: 'asc' },
    });
    return rows;
  }

  async calculate(dto: ExportCalcDto) {
    const card = await this.prisma.courierRateCard.findUnique({
      where: { carrier: dto.carrier },
    });
    if (!card) throw new NotFoundException(`No rate card for ${dto.carrier}.`);

    const zoneRow = await this.prisma.courierZone.findFirst({
      where: { rateCardId: card.id, country: { equals: dto.country, mode: 'insensitive' } },
    });
    if (!zoneRow) {
      throw new BadRequestException(`No ${dto.carrier} zone found for "${dto.country}".`);
    }
    const zone = zoneRow.zone;

    // Volumetric weight (kg). cm ÷ divisorCm; inch ÷ divisorIn → lb → kg.
    const dims = (dto.lengthCm ?? 0) * (dto.widthCm ?? 0) * (dto.heightCm ?? 0);
    const hasDims = dims > 0;
    const volumetricKg =
      !hasDims
        ? 0
        : dto.unit === 'in'
          ? (dims / card.volumetricDivisorIn) * LB_TO_KG
          : dims / card.volumetricDivisorCm;

    const actual = dto.actualWeightKg ?? 0;
    const chargeable = Math.max(actual, volumetricKg);
    if (chargeable <= 0) {
      throw new BadRequestException('Enter an actual weight or dimensions.');
    }

    // Round up to the next 0.5 kg for the rate table.
    const billed = Math.ceil(chargeable / 0.5) * 0.5;
    const flatMax = num(card.flatMaxWeightKg);

    const { base, matchedWeight, regime } = await this.lookupBase(
      card.id,
      zone,
      billed,
      chargeable,
      flatMax,
    );

    // Pricing chain (all factors editable on the card).
    const ratePerKg = base / chargeable;
    const surcharge = num(card.surchargePerKg);
    const fuelPct = num(card.fuelPct);
    const gstPct = num(card.gstPct);
    const marginX = num(card.marginX);

    // Fuel-application order differs by carrier (editable per card):
    //   DHL   SURCHARGE_THEN_FUEL: (rate + surcharge) × (1 + fuel)
    //   FedEx FUEL_THEN_SURCHARGE:  rate × (1 + fuel) + surcharge
    let fuelPerKg: number;
    let subtotalPerKg: number;
    if (card.fuelOrder === CourierFuelOrder.FUEL_THEN_SURCHARGE) {
      fuelPerKg = ratePerKg * fuelPct;
      subtotalPerKg = ratePerKg + fuelPerKg + surcharge;
    } else {
      fuelPerKg = (ratePerKg + surcharge) * fuelPct;
      subtotalPerKg = ratePerKg + surcharge + fuelPerKg;
    }
    const costToUs = subtotalPerKg * chargeable;
    const sellingInr = costToUs * marginX;
    const gstAmount = sellingInr * gstPct;
    const grandTotalInr = sellingInr + gstAmount;

    const conv = (v: number) => ({
      inr: r2(v),
      usd: r2(v / num(card.usdRate)),
      gbp: r2(v / num(card.gbpRate)),
      eur: r2(v / num(card.eurRate)),
    });

    return {
      carrier: dto.carrier,
      country: zoneRow.country,
      zone,
      unit: dto.unit,
      dims: { length: dto.lengthCm ?? null, width: dto.widthCm ?? null, height: dto.heightCm ?? null },
      actualWeightKg: r2(actual),
      volumetricWeightKg: r2(volumetricKg),
      chargeableWeightKg: r2(chargeable),
      billedWeightKg: billed,
      regime, // 'FLAT' | 'PERKG'
      matchedWeightKg: matchedWeight,
      currency: 'INR',
      breakdown: {
        base: r2(base),
        ratePerKg: r2(ratePerKg),
        surchargePerKg: surcharge,
        fuelPct,
        fuelOrder: card.fuelOrder,
        fuelPerKg: r2(fuelPerKg),
        subtotalPerKg: r2(subtotalPerKg),
        costToUs: r2(costToUs),
        marginX,
        sellingInr: r2(sellingInr),
        gstPct,
        gstAmount: r2(gstAmount),
        grandTotalInr: r2(grandTotalInr),
      },
      selling: conv(sellingInr),
      grandTotal: conv(grandTotalInr),
      config: {
        volumetricDivisorCm: card.volumetricDivisorCm,
        volumetricDivisorIn: card.volumetricDivisorIn,
        usdRate: num(card.usdRate),
        gbpRate: num(card.gbpRate),
        eurRate: num(card.eurRate),
      },
    };
  }

  // ─── helpers ───────────────────────────────────────────────

  private async lookupBase(
    cardId: string,
    zone: string,
    billed: number,
    chargeable: number,
    flatMax: number,
  ): Promise<{ base: number; matchedWeight: number; regime: 'FLAT' | 'PERKG' }> {
    if (billed <= flatMax) {
      // Flat total for the billed (rounded-up) weight.
      const row =
        (await this.prisma.courierRateRow.findFirst({
          where: { rateCardId: cardId, zone, perKg: false, weightKg: billed },
        })) ??
        // fall back to the smallest flat row >= billed
        (await this.prisma.courierRateRow.findFirst({
          where: { rateCardId: cardId, zone, perKg: false, weightKg: { gte: billed } },
          orderBy: { weightKg: 'asc' },
        }));
      if (!row) throw new BadRequestException(`No ${zone}-zone rate for ${billed} kg.`);
      return { base: num(row.price), matchedWeight: num(row.weightKg), regime: 'FLAT' };
    }
    // Per-kg regime: largest breakpoint <= chargeable, price × chargeable.
    const brk =
      (await this.prisma.courierRateRow.findFirst({
        where: { rateCardId: cardId, zone, perKg: true, weightKg: { lte: chargeable } },
        orderBy: { weightKg: 'desc' },
      })) ??
      (await this.prisma.courierRateRow.findFirst({
        where: { rateCardId: cardId, zone, perKg: true },
        orderBy: { weightKg: 'asc' },
      }));
    if (!brk) throw new BadRequestException(`No ${zone}-zone per-kg rate above ${flatMax} kg.`);
    return {
      base: num(brk.price) * chargeable,
      matchedWeight: num(brk.weightKg),
      regime: 'PERKG',
    };
  }

  private publicCard(
    c: Prisma.CourierRateCardGetPayload<{ include: { _count: { select: { zones: true; rates: true } } } }>,
  ) {
    return {
      carrier: c.carrier,
      currency: c.currency,
      fuelOrder: c.fuelOrder,
      volumetricDivisorCm: c.volumetricDivisorCm,
      volumetricDivisorIn: c.volumetricDivisorIn,
      flatMaxWeightKg: num(c.flatMaxWeightKg),
      surchargePerKg: num(c.surchargePerKg),
      fuelPct: num(c.fuelPct),
      gstPct: num(c.gstPct),
      marginX: num(c.marginX),
      usdRate: num(c.usdRate),
      gbpRate: num(c.gbpRate),
      eurRate: num(c.eurRate),
      updatedAt: c.updatedAt,
      countries: c._count.zones,
      rateRows: c._count.rates,
    };
  }
}
