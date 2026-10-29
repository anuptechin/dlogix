import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChargeType,
  EnquiryStatus,
  EnquiryVendorStatus,
  Prisma,
  QuoteStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveQuotationDto } from './dto/save-quotation.dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const usdInr = () => Number(process.env.USD_INR_RATE ?? 83);
const toInr = (amount: number, currency?: string | null) =>
  (currency ?? 'INR').toUpperCase() === 'USD' ? amount * usdInr() : amount;

const evInclude = {
  vendor: true,
  enquiry: {
    include: {
      origin: true,
      destination: true,
      requiredCharges: { include: { chargeType: true } },
    },
  },
  quotation: {
    include: {
      lines: { orderBy: { amount: 'desc' as const } },
      options: { orderBy: { sortOrder: 'asc' as const }, include: { lines: true } },
    },
  },
} satisfies Prisma.EnquiryVendorInclude;

type ResolvedEV = Prisma.EnquiryVendorGetPayload<{ include: typeof evInclude }>;
type QuoteWithAll = Prisma.QuotationGetPayload<{
  include: { lines: true; options: { include: { lines: true } } };
}>;

// The simplified 5-line set applies to Export Sea (FCL/LCL) + Air.
const OPTION_MODES = ['FCL', 'LCL', 'AIR'];
const usesOptions = (dir: string, mode: string) =>
  dir === 'EXPORT' && OPTION_MODES.includes(mode);

// Fixed charge lines per mode: { chargeTypeName, currency }. Top line = freight.
function fixedSpec(mode: string): { name: string; currency: string }[] {
  if (mode === 'AIR') {
    return [
      { name: 'Air Freight', currency: 'INR' },
      { name: 'AWB Charges', currency: 'INR' },
      { name: 'THC', currency: 'INR' },
    ];
  }
  const ocean = mode === 'LCL' ? 'Ocean Freight (LCL)' : 'Ocean Freight';
  return [
    { name: ocean, currency: 'USD' },
    { name: 'BL Charges', currency: 'INR' },
    { name: 'THC', currency: 'INR' },
  ];
}

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(token: string) {
    const ev = await this.resolve(token);
    const optionFlow = usesOptions(ev.enquiry.direction, ev.enquiry.mode);

    if (ev.status === EnquiryVendorStatus.INVITED) {
      await this.prisma.enquiryVendor.update({
        where: { id: ev.id },
        data: { status: EnquiryVendorStatus.OPENED },
      });
    }

    // Legacy charge list (used for non-option modes).
    const required = ev.enquiry.requiredCharges.map((rc) => rc.chargeType);
    const chargeTypes = required.length
      ? required.sort((a, b) => a.name.localeCompare(b.name))
      : await this.prisma.chargeType.findMany({
          where: { isActive: true, appliesToMode: { has: ev.enquiry.mode } },
          orderBy: { name: 'asc' },
        });

    let quotation = ev.quotation;
    if (!quotation) {
      quotation = optionFlow
        ? await this.seedOptionQuotation(ev)
        : await this.seedLegacyQuotation(ev, chargeTypes);
    } else if (optionFlow && quotation.options.length === 0) {
      // Quote existed without options (e.g. seeded before this feature) — add one.
      const opt = await this.prisma.quotationOption.create({
        data: { quotationId: quotation.id, sortOrder: 0 },
      });
      const lines = await this.fixedLines(ev);
      await this.prisma.quotationLine.createMany({
        data: lines.map((l) => ({ ...l, quotationId: quotation!.id, quotationOptionId: opt.id })),
      });
      quotation = await this.reload(quotation.id);
    }

    return {
      expired: ev.tokenExpiresAt.getTime() < Date.now(),
      useOptions: optionFlow,
      vendor: { name: ev.vendor.name, contactPerson: ev.vendor.contactPerson },
      enquiry: this.publicEnquiry(ev),
      chargeTypes: chargeTypes.map((c) => ({
        id: c.id,
        name: c.name,
        unit: c.unit,
        category: c.category,
      })),
      quotation: this.publicQuotation(quotation),
    };
  }

  async save(token: string, dto: SaveQuotationDto) {
    const ev = await this.resolve(token);
    this.assertOpen(ev);
    const optionFlow = usesOptions(ev.enquiry.direction, ev.enquiry.mode);

    const quotation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({ where: { enquiryVendorId: ev.id } });
      const id =
        existing?.id ??
        (await tx.quotation.create({ data: { enquiryVendorId: ev.id } })).id;
      const keepSubmitted = existing?.status === QuoteStatus.SUBMITTED;

      if (optionFlow && dto.options) {
        // Replace all options + their lines.
        await tx.quotationOption.deleteMany({ where: { quotationId: id } });
        await tx.quotationLine.deleteMany({ where: { quotationId: id } });
        let best = Number.POSITIVE_INFINITY;
        for (let i = 0; i < dto.options.length; i++) {
          const opt = dto.options[i];
          const lines = (opt.lines ?? []).map((l) => {
            const amount = round2(l.qty * l.rate);
            return {
              quotationId: id,
              chargeTypeId: l.chargeTypeId ?? null,
              description: l.description ?? null,
              unit: l.unit ?? null,
              currency: (l.currency ?? 'INR').toUpperCase(),
              qty: l.qty,
              rate: l.rate,
              amount,
            };
          });
          const totalInr = round2(lines.reduce((s, l) => s + toInr(l.amount, l.currency), 0));
          if (totalInr > 0) best = Math.min(best, totalInr);
          const created = await tx.quotationOption.create({
            data: {
              quotationId: id,
              label: opt.label ?? null,
              shippingLine: opt.shippingLine ?? null,
              vesselName: opt.vesselName ?? null,
              etd: opt.etd ? new Date(opt.etd) : null,
              eta: opt.eta ? new Date(opt.eta) : null,
              transitTimeDays: opt.transitTimeDays ?? null,
              transshipments: opt.transshipments ?? null,
              rateType: opt.rateType ?? null,
              freeDetentionOriginDays: opt.freeDetentionOriginDays ?? null,
              freeDetentionDestDays: opt.freeDetentionDestDays ?? null,
              freeDemurrageDestDays: opt.freeDemurrageDestDays ?? null,
              totalInr,
              sortOrder: i,
            },
          });
          await tx.quotationLine.createMany({
            data: lines.map((l) => ({ ...l, quotationOptionId: created.id })),
          });
        }
        await tx.quotation.update({
          where: { id },
          data: {
            currency: 'INR',
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            remarks: dto.remarks ?? null,
            totalAmount: Number.isFinite(best) ? best : 0,
            status: keepSubmitted ? QuoteStatus.SUBMITTED : QuoteStatus.DRAFT,
          },
        });
      } else {
        // Legacy single-set flow.
        const lines = (dto.lines ?? []).map((l) => ({
          chargeTypeId: l.chargeTypeId ?? null,
          description: l.description ?? null,
          unit: l.unit ?? null,
          currency: (l.currency ?? 'INR').toUpperCase(),
          qty: l.qty,
          rate: l.rate,
          amount: round2(l.qty * l.rate),
        }));
        const total = round2(lines.reduce((s, l) => s + l.amount, 0));
        await tx.quotationLine.deleteMany({ where: { quotationId: id } });
        await tx.quotation.update({
          where: { id },
          data: {
            currency: dto.currency ?? 'INR',
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            transitTimeDays: dto.transitTimeDays ?? null,
            remarks: dto.remarks ?? null,
            totalAmount: total,
            rateType: dto.rateType ?? null,
            freeDetentionOriginDays: dto.freeDetentionOriginDays ?? null,
            freeDetentionDestDays: dto.freeDetentionDestDays ?? null,
            freeDemurrageDestDays: dto.freeDemurrageDestDays ?? null,
            etd: dto.etd ? new Date(dto.etd) : null,
            eta: dto.eta ? new Date(dto.eta) : null,
            transshipments: dto.transshipments ?? null,
            shippingLine: dto.shippingLine ?? null,
            vesselName: dto.vesselName ?? null,
            status: keepSubmitted ? QuoteStatus.SUBMITTED : QuoteStatus.DRAFT,
            lines: { create: lines },
          },
        });
      }
      return this.reload(id, tx);
    });

    return this.publicQuotation(quotation);
  }

  async submit(token: string) {
    const ev = await this.resolve(token);
    this.assertOpen(ev);
    const optionFlow = usesOptions(ev.enquiry.direction, ev.enquiry.mode);

    const quotation = await this.prisma.quotation.findUnique({
      where: { enquiryVendorId: ev.id },
      include: { options: true },
    });
    const ok = optionFlow
      ? (quotation?.options ?? []).some((o) => Number(o.totalInr) > 0)
      : quotation && Number(quotation.totalAmount) > 0;
    if (!quotation || !ok) {
      throw new BadRequestException(
        'Add at least one rate before submitting your quotation.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: QuoteStatus.SUBMITTED, submittedAt: new Date() },
      });
      await tx.enquiryVendor.update({
        where: { id: ev.id },
        data: { status: EnquiryVendorStatus.RESPONDED, respondedAt: new Date() },
      });
      if (ev.enquiry.status === EnquiryStatus.SENT) {
        await tx.enquiry.update({
          where: { id: ev.enquiryId },
          data: { status: EnquiryStatus.QUOTING },
        });
      }
    });

    return this.getSummary(token);
  }

  // ─── helpers ───────────────────────────────────────────────

  private async resolve(token: string): Promise<ResolvedEV> {
    const ev = await this.prisma.enquiryVendor.findUnique({
      where: { inviteToken: token },
      include: evInclude,
    });
    if (!ev) throw new NotFoundException('This quotation link is not valid.');
    return ev;
  }

  private assertOpen(ev: ResolvedEV) {
    if (ev.tokenExpiresAt.getTime() < Date.now()) {
      throw new GoneException(
        'This quotation link has expired. Please contact D’Decor Logistics for a new invitation.',
      );
    }
  }

  private reload(id: string, tx?: Prisma.TransactionClient): Promise<QuoteWithAll> {
    const client = tx ?? this.prisma;
    return client.quotation.findUniqueOrThrow({
      where: { id },
      include: {
        lines: { orderBy: { amount: 'desc' } },
        options: { orderBy: { sortOrder: 'asc' }, include: { lines: true } },
      },
    });
  }

  // Build the fixed 5-line set (3 charge types + 2 blank KPI lines) for an option.
  private async fixedLines(ev: ResolvedEV) {
    const spec = fixedSpec(ev.enquiry.mode);
    const cts = await this.prisma.chargeType.findMany({
      where: { name: { in: spec.map((s) => s.name) } },
    });
    const byName = new Map(cts.map((c) => [c.name, c]));
    const cw = ev.enquiry.chargeableWeight ? Number(ev.enquiry.chargeableWeight) : null;
    const vol = ev.enquiry.volumeCbm ? Number(ev.enquiry.volumeCbm) : null;
    const fixed = spec.map((s) => {
      const ct = byName.get(s.name);
      let qty = 1;
      if (ct?.unit === 'per_kg' && cw) qty = cw;
      else if (ct?.unit === 'per_cbm' && vol) qty = vol;
      return {
        chargeTypeId: ct?.id ?? null,
        description: s.name,
        unit: ct?.unit ?? null,
        currency: s.currency,
        qty,
        rate: 0,
        amount: 0,
      };
    });
    // 2 free KPI lines (vendor types the name + value, in INR).
    const kpi = [1, 2].map(() => ({
      chargeTypeId: null,
      description: '',
      unit: null,
      currency: 'INR',
      qty: 1,
      rate: 0,
      amount: 0,
    }));
    return [...fixed, ...kpi];
  }

  private async seedOptionQuotation(ev: ResolvedEV): Promise<QuoteWithAll> {
    const lines = await this.fixedLines(ev);
    const q = await this.prisma.quotation.create({
      data: { enquiryVendorId: ev.id, currency: 'INR', status: QuoteStatus.PENDING },
    });
    const opt = await this.prisma.quotationOption.create({
      data: { quotationId: q.id, sortOrder: 0 },
    });
    await this.prisma.quotationLine.createMany({
      data: lines.map((l) => ({ ...l, quotationId: q.id, quotationOptionId: opt.id })),
    });
    return this.reload(q.id);
  }

  private async seedLegacyQuotation(
    ev: ResolvedEV,
    chargeTypes: ChargeType[],
  ): Promise<QuoteWithAll> {
    const cw = ev.enquiry.chargeableWeight ? Number(ev.enquiry.chargeableWeight) : null;
    const vol = ev.enquiry.volumeCbm ? Number(ev.enquiry.volumeCbm) : null;
    const lines = chargeTypes.map((ct) => {
      let qty = 1;
      if (ct.unit === 'per_kg' && cw) qty = cw;
      else if (ct.unit === 'per_cbm' && vol) qty = vol;
      return {
        chargeTypeId: ct.id,
        description: ct.name,
        unit: ct.unit ?? null,
        currency: 'INR',
        qty,
        rate: 0,
        amount: 0,
      };
    });
    const q = await this.prisma.quotation.create({
      data: {
        enquiryVendorId: ev.id,
        currency: 'INR',
        status: QuoteStatus.PENDING,
        lines: { create: lines },
      },
    });
    return this.reload(q.id);
  }

  private publicEnquiry(ev: ResolvedEV) {
    const e = ev.enquiry;
    return {
      enquiryNo: e.enquiryNo,
      direction: e.direction,
      mode: e.mode,
      incoterm: e.incoterm,
      cargoDesc: e.cargoDesc,
      commodity: e.commodity,
      packageType: e.packageType,
      packageCount: e.packageCount,
      weightKg: e.weightKg,
      volumeCbm: e.volumeCbm,
      chargeableWeight: e.chargeableWeight,
      serviceScope: e.serviceScope,
      specialInstructions: e.specialInstructions,
      quoteDeadline: e.quoteDeadline,
      quoteValidityDate: e.quoteValidityDate,
      sailingRequiredBefore: e.sailingRequiredBefore,
      tokenExpiresAt: ev.tokenExpiresAt,
      origin: e.origin
        ? { code: e.origin.code, name: e.origin.name, country: e.origin.country }
        : null,
      destination: e.destination
        ? { code: e.destination.code, name: e.destination.name, country: e.destination.country }
        : null,
    };
  }

  private publicLine(l: QuoteWithAll['lines'][number]) {
    return {
      id: l.id,
      chargeTypeId: l.chargeTypeId,
      description: l.description,
      unit: l.unit,
      currency: l.currency,
      qty: l.qty,
      rate: l.rate,
      amount: l.amount,
    };
  }

  private publicQuotation(q: QuoteWithAll) {
    return {
      id: q.id,
      currency: q.currency,
      validUntil: q.validUntil,
      transitTimeDays: q.transitTimeDays,
      remarks: q.remarks,
      status: q.status,
      submittedAt: q.submittedAt,
      totalAmount: q.totalAmount,
      rateType: q.rateType,
      freeDetentionOriginDays: q.freeDetentionOriginDays,
      freeDetentionDestDays: q.freeDetentionDestDays,
      freeDemurrageDestDays: q.freeDemurrageDestDays,
      etd: q.etd,
      eta: q.eta,
      transshipments: q.transshipments,
      shippingLine: q.shippingLine,
      vesselName: q.vesselName,
      lines: q.lines.map((l) => this.publicLine(l)),
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        shippingLine: o.shippingLine,
        vesselName: o.vesselName,
        etd: o.etd,
        eta: o.eta,
        transitTimeDays: o.transitTimeDays,
        transshipments: o.transshipments,
        rateType: o.rateType,
        freeDetentionOriginDays: o.freeDetentionOriginDays,
        freeDetentionDestDays: o.freeDetentionDestDays,
        freeDemurrageDestDays: o.freeDemurrageDestDays,
        totalInr: o.totalInr,
        lines: o.lines.map((l) => this.publicLine(l)),
      })),
    };
  }
}
