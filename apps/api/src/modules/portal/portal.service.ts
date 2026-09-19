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

const evInclude = {
  vendor: true,
  enquiry: {
    include: {
      origin: true,
      destination: true,
      requiredCharges: { include: { chargeType: true } },
    },
  },
  quotation: { include: { lines: { orderBy: { amount: 'desc' as const } } } },
} satisfies Prisma.EnquiryVendorInclude;

type ResolvedEV = Prisma.EnquiryVendorGetPayload<{ include: typeof evInclude }>;

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(token: string) {
    const ev = await this.resolve(token);

    // First open → mark as opened (don't downgrade a later status).
    if (ev.status === EnquiryVendorStatus.INVITED) {
      await this.prisma.enquiryVendor.update({
        where: { id: ev.id },
        data: { status: EnquiryVendorStatus.OPENED },
      });
    }

    // BRD: if the enquiry specifies which charges to quote, use exactly those;
    // otherwise fall back to all charge types applicable to the mode.
    const required = ev.enquiry.requiredCharges.map((rc) => rc.chargeType);
    const chargeTypes = required.length
      ? required.sort((a, b) => a.name.localeCompare(b.name))
      : await this.prisma.chargeType.findMany({
          where: { isActive: true, appliesToMode: { has: ev.enquiry.mode } },
          orderBy: { name: 'asc' },
        });

    // Seed a draft quotation with suggested lines so the vendor only types rates.
    let quotation = ev.quotation;
    if (!quotation) {
      quotation = await this.seedQuotation(ev, chargeTypes);
    }

    return {
      expired: ev.tokenExpiresAt.getTime() < Date.now(),
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

    const lines = dto.lines.map((l) => ({
      chargeTypeId: l.chargeTypeId ?? null,
      description: l.description ?? null,
      unit: l.unit ?? null,
      qty: l.qty,
      rate: l.rate,
      amount: round2(l.qty * l.rate),
    }));
    const total = round2(lines.reduce((s, l) => s + l.amount, 0));

    const quotation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({
        where: { enquiryVendorId: ev.id },
      });
      const id =
        existing?.id ??
        (await tx.quotation.create({ data: { enquiryVendorId: ev.id } })).id;

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
          // Keep SUBMITTED if already submitted; otherwise it's a saved DRAFT.
          status:
            existing?.status === QuoteStatus.SUBMITTED
              ? QuoteStatus.SUBMITTED
              : QuoteStatus.DRAFT,
          lines: { create: lines },
        },
      });
      return tx.quotation.findUniqueOrThrow({
        where: { id },
        include: { lines: { orderBy: { amount: 'desc' } } },
      });
    });

    return this.publicQuotation(quotation);
  }

  async submit(token: string) {
    const ev = await this.resolve(token);
    this.assertOpen(ev);

    const quotation = await this.prisma.quotation.findUnique({
      where: { enquiryVendorId: ev.id },
    });
    if (!quotation || Number(quotation.totalAmount) <= 0) {
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
        data: {
          status: EnquiryVendorStatus.RESPONDED,
          respondedAt: new Date(),
        },
      });
      // First response moves the enquiry into QUOTING.
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
    if (!ev) {
      throw new NotFoundException('This quotation link is not valid.');
    }
    return ev;
  }

  private assertOpen(ev: ResolvedEV) {
    if (ev.tokenExpiresAt.getTime() < Date.now()) {
      throw new GoneException(
        'This quotation link has expired. Please contact D’Decor Logistics for a new invitation.',
      );
    }
  }

  private async seedQuotation(ev: ResolvedEV, chargeTypes: ChargeType[]) {
    const cw = ev.enquiry.chargeableWeight
      ? Number(ev.enquiry.chargeableWeight)
      : null;
    const vol = ev.enquiry.volumeCbm ? Number(ev.enquiry.volumeCbm) : null;

    const lines = chargeTypes.map((ct) => {
      let qty = 1;
      if (ct.unit === 'per_kg' && cw) qty = cw;
      else if (ct.unit === 'per_cbm' && vol) qty = vol;
      return {
        chargeTypeId: ct.id,
        description: ct.name,
        unit: ct.unit ?? null,
        qty,
        rate: 0,
        amount: 0,
      };
    });

    return this.prisma.quotation.create({
      data: {
        enquiryVendorId: ev.id,
        currency: 'INR',
        status: QuoteStatus.PENDING,
        lines: { create: lines },
      },
      include: { lines: { orderBy: { amount: 'desc' } } },
    });
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
        ? {
            code: e.destination.code,
            name: e.destination.name,
            country: e.destination.country,
          }
        : null,
    };
  }

  private publicQuotation(
    q: Prisma.QuotationGetPayload<{ include: { lines: true } }>,
  ) {
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
      lines: q.lines.map((l) => ({
        id: l.id,
        chargeTypeId: l.chargeTypeId,
        description: l.description,
        unit: l.unit,
        qty: l.qty,
        rate: l.rate,
        amount: l.amount,
      })),
    };
  }
}
