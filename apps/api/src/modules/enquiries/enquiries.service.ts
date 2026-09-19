import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChargeCategory,
  EnquiryStatus,
  FeedbackType,
  Prisma,
  QuoteStatus,
  ShipmentMode,
  ShipmentDirection,
} from '@prisma/client';
import { unlink } from 'node:fs/promises';
import { getReqCtx } from '../../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { generateToken } from '../../common/tokens';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';

// Read at call time (env is loaded by ConfigModule after this file is imported).
const webBaseUrl = () => process.env.WEB_BASE_URL ?? 'http://localhost:5103';
const graceHours = () => Number(process.env.VENDOR_TOKEN_GRACE_HOURS ?? 48);

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

const detailInclude = {
  origin: true,
  destination: true,
  originIcdCfs: true,
  customer: true,
  consignee: true,
  supplier: true,
  buyer: true,
  dimensions: true,
  containers: true,
  requiredCharges: { include: { chargeType: true } },
  documents: true,
  createdBy: { select: { id: true, name: true, email: true } },
  enquiryVendors: {
    include: {
      vendor: true,
      quotation: { select: { id: true, status: true, totalAmount: true } },
    },
    orderBy: { invitedAt: 'asc' as const },
  },
  award: true,
} satisfies Prisma.EnquiryInclude;

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  findAll(filters: { status?: EnquiryStatus; mode?: ShipmentMode; direction?: ShipmentDirection }) {
    const where: Prisma.EnquiryWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.mode) where.mode = filters.mode;
    if (filters.direction) where.direction = filters.direction;
    return this.prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        origin: true,
        destination: true,
        _count: { select: { enquiryVendors: true } },
      },
    });
  }

  async findOne(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!enquiry) throw new NotFoundException(`Enquiry ${id} not found`);
    return enquiry;
  }

  async create(dto: CreateEnquiryDto) {
    const user = await this.actingUser();
    const derived = this.deriveWeights(dto);
    return this.prisma.$transaction(async (tx) => {
      const enquiryNo = await this.nextEnquiryNo(tx);
      return tx.enquiry.create({
        data: {
          ...this.mapScalars(dto),
          ...derived,
          direction: dto.direction,
          mode: dto.mode,
          enquiryNo,
          status: EnquiryStatus.DRAFT,
          createdById: user.id,
          dimensions: dto.dimensions?.length
            ? { create: dto.dimensions.map(this.dimData) }
            : undefined,
          containers: dto.containers?.length
            ? { create: dto.containers.map(this.containerData) }
            : undefined,
          requiredCharges: dto.requiredChargeTypeIds?.length
            ? {
                create: [...new Set(dto.requiredChargeTypeIds)].map(
                  (chargeTypeId) => ({ chargeTypeId }),
                ),
              }
            : undefined,
        },
        include: detailInclude,
      });
    });
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT enquiries can be edited');
    }
    const derived = this.deriveWeights(dto);
    return this.prisma.$transaction(async (tx) => {
      // Replace child collections when the client sends them.
      if (dto.dimensions) {
        await tx.enquiryDimension.deleteMany({ where: { enquiryId: id } });
        if (dto.dimensions.length)
          await tx.enquiryDimension.createMany({
            data: dto.dimensions.map((d) => ({ ...this.dimData(d), enquiryId: id })),
          });
      }
      if (dto.containers) {
        await tx.enquiryContainer.deleteMany({ where: { enquiryId: id } });
        if (dto.containers.length)
          await tx.enquiryContainer.createMany({
            data: dto.containers.map((c) => ({
              ...this.containerData(c),
              enquiryId: id,
            })),
          });
      }
      if (dto.requiredChargeTypeIds) {
        await tx.enquiryRequiredCharge.deleteMany({ where: { enquiryId: id } });
        if (dto.requiredChargeTypeIds.length)
          await tx.enquiryRequiredCharge.createMany({
            data: [...new Set(dto.requiredChargeTypeIds)].map((chargeTypeId) => ({
              enquiryId: id,
              chargeTypeId,
            })),
          });
      }
      return tx.enquiry.update({
        where: { id },
        data: { ...this.mapScalars(dto), ...derived },
        include: detailInclude,
      });
    });
  }

  async addVendors(id: string, vendorIds: string[]) {
    const enquiry = await this.findOne(id);
    if (
      enquiry.status !== EnquiryStatus.DRAFT &&
      enquiry.status !== EnquiryStatus.SENT &&
      enquiry.status !== EnquiryStatus.QUOTING
    ) {
      throw new BadRequestException(
        'Cannot add vendors after the enquiry is compared/awarded',
      );
    }
    const already = new Set(enquiry.enquiryVendors.map((ev) => ev.vendorId));
    const toAdd = [...new Set(vendorIds)].filter((v) => !already.has(v));
    const expiry = this.computeExpiry(enquiry.quoteDeadline);

    if (toAdd.length) {
      await this.prisma.$transaction(
        toAdd.map((vendorId) =>
          this.prisma.enquiryVendor.create({
            data: {
              enquiryId: id,
              vendorId,
              inviteToken: generateToken(),
              tokenExpiresAt: expiry,
            },
          }),
        ),
      );
    }
    return this.findOne(id);
  }

  async removeVendor(id: string, enquiryVendorId: string) {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.DRAFT) {
      throw new BadRequestException(
        'Vendors can only be removed while the enquiry is a DRAFT',
      );
    }
    await this.prisma.enquiryVendor.delete({ where: { id: enquiryVendorId } });
    return this.findOne(id);
  }

  async send(id: string) {
    const enquiry = await this.findOne(id);
    if (enquiry.enquiryVendors.length === 0) {
      throw new BadRequestException('Add at least one vendor before sending');
    }

    for (const ev of enquiry.enquiryVendors) {
      const link = `${webBaseUrl()}/quote/${ev.inviteToken}`;
      const deadline = enquiry.quoteDeadline
        ? enquiry.quoteDeadline.toISOString().slice(0, 10)
        : 'at the earliest';
      await this.email.send({
        to: ev.vendor.email,
        subject: `Request for Quotation — ${enquiry.enquiryNo}`,
        text: [
          `Dear ${ev.vendor.contactPerson ?? ev.vendor.name},`,
          '',
          `D'Decor invites you to quote for the following shipment:`,
          `  Enquiry:     ${enquiry.enquiryNo}`,
          `  Direction:   ${enquiry.direction}`,
          `  Mode:        ${enquiry.mode}`,
          `  Route:       ${enquiry.origin?.name ?? '—'} → ${enquiry.destination?.name ?? '—'}`,
          `  Submit by:   ${deadline}`,
          '',
          `Please submit your quotation here:`,
          `  ${link}`,
          '',
          `Regards,`,
          `D'Decor Logistics`,
        ].join('\n'),
      });
      await this.prisma.enquiryVendor.update({
        where: { id: ev.id },
        data: { invitedAt: new Date() },
      });
    }

    return this.prisma.enquiry.update({
      where: { id },
      data: { status: EnquiryStatus.SENT },
      include: detailInclude,
    });
  }

  async award(id: string, quotationId: string, reason?: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: {
        origin: true,
        destination: true,
        award: true,
        enquiryVendors: { include: { vendor: true, quotation: true } },
      },
    });
    if (!enquiry) throw new NotFoundException(`Enquiry ${id} not found`);
    if (enquiry.award) {
      throw new BadRequestException('This enquiry has already been awarded.');
    }

    const winner = enquiry.enquiryVendors.find(
      (ev) =>
        ev.quotation?.id === quotationId &&
        ev.quotation?.status === QuoteStatus.SUBMITTED,
    );
    if (!winner || !winner.quotation) {
      throw new BadRequestException(
        'Selected quotation is not a submitted quote on this enquiry.',
      );
    }

    const user = await this.actingUser();
    const winnerQuote = winner.quotation;
    const submittedVendors = enquiry.enquiryVendors.filter(
      (ev) => ev.quotation?.status === QuoteStatus.SUBMITTED,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.award.create({
        data: {
          enquiryId: id,
          quotationId,
          awardedById: user.id,
          awardedAmount: winnerQuote.totalAmount,
          reason: reason ?? null,
        },
      });
      // Feed the historical rate database for this lane.
      await tx.shipmentHistory.create({
        data: {
          enquiryId: id,
          direction: enquiry.direction,
          mode: enquiry.mode,
          originId: enquiry.originId,
          destinationId: enquiry.destinationId,
          vendorId: winner.vendorId,
          amount: winnerQuote.totalAmount,
          currency: winnerQuote.currency,
          awardedAt: new Date(),
        },
      });
      await tx.enquiry.update({
        where: { id },
        data: { status: EnquiryStatus.AWARDED },
      });
      // Blind feedback rows: WON for the winner, GENERIC for the rest —
      // never storing/exposing the winning rate or vendor to losers.
      for (const ev of submittedVendors) {
        const won = ev.id === winner.id;
        await tx.vendorFeedback.create({
          data: {
            enquiryVendorId: ev.id,
            feedbackType: won ? FeedbackType.WON : FeedbackType.GENERIC,
            message: won
              ? 'Your quotation was accepted.'
              : 'Not successful on this occasion.',
            sentAt: new Date(),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'AWARD',
          entity: 'Enquiry',
          entityId: id,
          after: {
            quotationId,
            vendorId: winner.vendorId,
            amount: Number(winnerQuote.totalAmount),
            reason: reason ?? null,
          },
        },
      });
    });

    // Emails (outside the transaction).
    const cur = winnerQuote.currency;
    const amt = Number(winnerQuote.totalAmount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    });
    for (const ev of submittedVendors) {
      if (ev.id === winner.id) {
        await this.email.send({
          to: ev.vendor.email,
          subject: `Your quotation was accepted — ${enquiry.enquiryNo}`,
          text: [
            `Dear ${ev.vendor.contactPerson ?? ev.vendor.name},`,
            '',
            `We are pleased to inform you that your quotation for enquiry ${enquiry.enquiryNo} has been accepted.`,
            `  Awarded amount: ${cur} ${amt}`,
            '',
            `Our team will be in touch with next steps. Thank you for your competitive offer.`,
            '',
            `Regards,`,
            `D'Decor Logistics`,
          ].join('\n'),
        });
      } else {
        // Blind feedback — no winning rate, no winning vendor.
        await this.email.send({
          to: ev.vendor.email,
          subject: `Outcome of your quotation — ${enquiry.enquiryNo}`,
          text: [
            `Dear ${ev.vendor.contactPerson ?? ev.vendor.name},`,
            '',
            `Thank you for submitting your quotation for enquiry ${enquiry.enquiryNo}.`,
            `On this occasion we have decided to proceed with another provider.`,
            '',
            `We genuinely value your participation and look forward to inviting you to future enquiries.`,
            '',
            `Regards,`,
            `D'Decor Logistics`,
          ].join('\n'),
        });
      }
    }

    return this.findOne(id);
  }

  async getComparison(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: {
        origin: true,
        destination: true,
        award: true,
        requiredCharges: { include: { chargeType: true } },
        enquiryVendors: {
          include: {
            vendor: true,
            quotation: { include: { lines: { include: { chargeType: true } } } },
          },
          orderBy: { invitedAt: 'asc' },
        },
      },
    });
    if (!enquiry) throw new NotFoundException(`Enquiry ${id} not found`);

    // A column key groups by charge type; custom (chargeType-less) lines
    // fall back to a description-based synthetic key so they still line up.
    const colKey = (l: { chargeTypeId: string | null; description: string | null }) =>
      l.chargeTypeId ?? `c:${(l.description ?? 'Other').trim().toLowerCase()}`;
    const colName = (l: {
      chargeType: { name: string } | null;
      description: string | null;
    }) => l.chargeType?.name ?? l.description ?? 'Other';

    const columns = new Map<
      string,
      { id: string; name: string; category: ChargeCategory }
    >();
    // Seed columns from the enquiry's required charges so every requested
    // line shows as a column even if a vendor left it blank.
    for (const rc of enquiry.requiredCharges) {
      columns.set(rc.chargeTypeId, {
        id: rc.chargeTypeId,
        name: rc.chargeType.name,
        category: rc.chargeType.category,
      });
    }
    for (const ev of enquiry.enquiryVendors) {
      const q = ev.quotation;
      if (!q || q.status !== QuoteStatus.SUBMITTED) continue;
      for (const line of q.lines) {
        const k = colKey(line);
        if (!columns.has(k))
          columns.set(k, {
            id: k,
            name: colName(line),
            category: line.chargeType?.category ?? ChargeCategory.OTHER,
          });
      }
    }

    const vendors = enquiry.enquiryVendors.map((ev) => {
      const q = ev.quotation;
      const submitted = !!q && q.status === QuoteStatus.SUBMITTED;
      const lines: Record<string, number> = {};
      const categoryTotals: Partial<Record<ChargeCategory, number>> = {};
      if (submitted) {
        for (const line of q!.lines) {
          const k = colKey(line);
          const amt = Number(line.amount);
          lines[k] = (lines[k] ?? 0) + amt;
          const cat = line.chargeType?.category ?? ChargeCategory.OTHER;
          categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amt;
        }
      }
      return {
        vendorId: ev.vendorId,
        enquiryVendorId: ev.id,
        name: ev.vendor.name,
        submitted,
        status: q?.status ?? QuoteStatus.PENDING,
        currency: q?.currency ?? 'INR',
        transitTimeDays: q?.transitTimeDays ?? null,
        validUntil: q?.validUntil ?? null,
        quotationId: q?.id ?? null,
        lines,
        total: submitted ? Number(q!.totalAmount) : null,
        categoryTotals: submitted ? categoryTotals : undefined,
        rateType: q?.rateType ?? undefined,
        freeDetentionOriginDays: q?.freeDetentionOriginDays ?? undefined,
        freeDetentionDestDays: q?.freeDetentionDestDays ?? undefined,
        freeDemurrageDestDays: q?.freeDemurrageDestDays ?? undefined,
        etd: q?.etd ?? undefined,
        eta: q?.eta ?? undefined,
        transshipments: q?.transshipments ?? undefined,
        shippingLine: q?.shippingLine ?? undefined,
        vesselName: q?.vesselName ?? undefined,
      };
    });

    const history = await this.prisma.shipmentHistory.findMany({
      where: {
        direction: enquiry.direction,
        mode: enquiry.mode,
        originId: enquiry.originId ?? undefined,
        destinationId: enquiry.destinationId ?? undefined,
      },
      include: { vendor: true },
      orderBy: { awardedAt: 'desc' },
      take: 5,
    });

    return {
      enquiry: {
        id: enquiry.id,
        enquiryNo: enquiry.enquiryNo,
        direction: enquiry.direction,
        mode: enquiry.mode,
        status: enquiry.status,
        chargeableWeight: enquiry.chargeableWeight
          ? Number(enquiry.chargeableWeight)
          : null,
        quoteDeadline: enquiry.quoteDeadline,
        origin: enquiry.origin
          ? { code: enquiry.origin.code, name: enquiry.origin.name }
          : null,
        destination: enquiry.destination
          ? { code: enquiry.destination.code, name: enquiry.destination.name }
          : null,
        awardedQuotationId: enquiry.award?.quotationId ?? null,
      },
      chargeTypes: [...columns.values()],
      vendors,
      history: history.map((h) => ({
        vendor: h.vendor?.name ?? '—',
        amount: h.amount ? Number(h.amount) : null,
        currency: h.currency,
        awardedAt: h.awardedAt,
      })),
    };
  }

  // ─── Smart Decision Panel (BRD) ─────────────────────────────
  async getInsights(id: string) {
    const e = await this.prisma.enquiry.findUnique({
      where: { id },
      include: { origin: true, destination: true },
    });
    if (!e) throw new NotFoundException(`Enquiry ${id} not found`);

    const laneWhere: Prisma.ShipmentHistoryWhereInput = {
      direction: e.direction,
      mode: e.mode,
      originId: e.originId ?? undefined,
      destinationId: e.destinationId ?? undefined,
    };
    const hist = await this.prisma.shipmentHistory.findMany({
      where: laneWhere,
      include: { vendor: true },
      orderBy: { awardedAt: 'desc' },
      take: 20,
    });
    const amts = hist.map((h) => Number(h.amount)).filter((n) => n > 0);
    const historicalRates = amts.length
      ? {
          count: amts.length,
          avg: round2(amts.reduce((s, n) => s + n, 0) / amts.length),
          low: Math.min(...amts),
          high: Math.max(...amts),
          currency: hist.find((h) => h.currency)?.currency ?? 'INR',
        }
      : null;
    const prev = hist[0];
    const previousShipment = prev
      ? {
          vendor: prev.vendor?.name ?? '—',
          amount: prev.amount ? Number(prev.amount) : null,
          currency: prev.currency ?? 'INR',
          awardedAt: prev.awardedAt,
        }
      : null;

    // Lane wins per vendor.
    const laneWinByVendor = new Map<string, number>();
    for (const h of hist)
      if (h.vendorId)
        laneWinByVendor.set(h.vendorId, (laneWinByVendor.get(h.vendorId) ?? 0) + 1);

    // Vendor performance across all enquiries.
    const evs = await this.prisma.enquiryVendor.findMany({
      include: {
        vendor: { select: { id: true, name: true } },
        quotation: { select: { status: true, awards: { select: { id: true } } } },
      },
    });
    const perfMap = new Map<
      string,
      { vendorId: string; name: string; invited: number; quoted: number; won: number }
    >();
    for (const ev of evs) {
      const p =
        perfMap.get(ev.vendorId) ??
        { vendorId: ev.vendorId, name: ev.vendor.name, invited: 0, quoted: 0, won: 0 };
      p.invited++;
      if (ev.quotation?.status === QuoteStatus.SUBMITTED) p.quoted++;
      if ((ev.quotation?.awards.length ?? 0) > 0) p.won++;
      perfMap.set(ev.vendorId, p);
    }
    const vendorPerformance = [...perfMap.values()]
      .map((p) => ({
        ...p,
        winRate: p.quoted ? Math.round((p.won / p.quoted) * 100) : 0,
        responseRate: p.invited ? Math.round((p.quoted / p.invited) * 100) : 0,
      }))
      .sort((a, b) => b.won - a.won || b.winRate - a.winRate);

    // Suggested vendors: capable of this mode, ranked by lane wins then win rate.
    const capable = await this.prisma.vendor.findMany({
      where: { isActive: true, modeCapabilities: { has: e.mode } },
      select: { id: true, name: true, email: true },
    });
    const suggestedVendors = capable
      .map((v) => {
        const perf = perfMap.get(v.id);
        return {
          vendorId: v.id,
          name: v.name,
          email: v.email,
          laneWins: laneWinByVendor.get(v.id) ?? 0,
          winRate: perf && perf.quoted ? Math.round((perf.won / perf.quoted) * 100) : 0,
          responseRate: perf && perf.invited ? Math.round((perf.quoted / perf.invited) * 100) : 0,
        };
      })
      .sort((a, b) => b.laneWins - a.laneWins || b.winRate - a.winRate)
      .slice(0, 6);

    // Duplicate detection: same lane + same trading party, not this enquiry.
    const partyOr: Prisma.EnquiryWhereInput[] = [];
    if (e.customerId) partyOr.push({ customerId: e.customerId });
    if (e.supplierId) partyOr.push({ supplierId: e.supplierId });
    const duplicates = await this.prisma.enquiry.findMany({
      where: {
        id: { not: id },
        direction: e.direction,
        mode: e.mode,
        originId: e.originId ?? undefined,
        destinationId: e.destinationId ?? undefined,
        status: { not: EnquiryStatus.CANCELLED },
        ...(partyOr.length ? { OR: partyOr } : {}),
      },
      select: { id: true, enquiryNo: true, status: true, createdAt: true, targetDate: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Incoterm responsibility guidance.
    let incoterm = null as null | { code: string; name: string; shownFields: unknown };
    if (e.incoterm) {
      const it = await this.prisma.incoterm.findUnique({ where: { code: e.incoterm } });
      if (it) incoterm = { code: it.code, name: it.name, shownFields: it.shownFields };
    }

    return {
      lane: {
        direction: e.direction,
        mode: e.mode,
        origin: e.origin ? { code: e.origin.code, name: e.origin.name } : null,
        destination: e.destination
          ? { code: e.destination.code, name: e.destination.name }
          : null,
      },
      previousShipment,
      historicalRates,
      vendorPerformance,
      suggestedVendors,
      duplicates,
      incoterm,
    };
  }

  // ─── Documents (BRD upload) ─────────────────────────────────
  async addDocument(
    id: string,
    file: { originalname: string; path: string; mimetype?: string; size?: number },
    docType?: string,
  ) {
    await this.findOne(id); // 404 if missing
    await this.prisma.enquiryDocument.create({
      data: {
        enquiryId: id,
        docType: docType ?? null,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype ?? null,
        sizeBytes: file.size ?? null,
      },
    });
    return this.findOne(id);
  }

  async getDocument(id: string, docId: string) {
    const doc = await this.prisma.enquiryDocument.findFirst({
      where: { id: docId, enquiryId: id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async removeDocument(id: string, docId: string) {
    const doc = await this.getDocument(id, docId);
    await this.prisma.enquiryDocument.delete({ where: { id: doc.id } });
    try {
      await unlink(doc.filePath);
    } catch {
      /* file already gone — ignore */
    }
    return this.findOne(id);
  }

  // ─── helpers ───────────────────────────────────────────────

  // Maps the DTO's scalar/JSON fields to Prisma data. Undefined values are
  // ignored by Prisma (no-op on update), so this serves create and update.
  private mapScalars(dto: Partial<CreateEnquiryDto>) {
    const d = (v?: string) => (v ? new Date(v) : undefined);
    return {
      direction: dto.direction,
      mode: dto.mode,
      originId: dto.originId,
      destinationId: dto.destinationId,
      originIcdCfsId: dto.originIcdCfsId,
      cargoDesc: dto.cargoDesc,
      weightKg: dto.weightKg,
      incoterm: dto.incoterm,
      targetDate: d(dto.targetDate),
      quoteDeadline: d(dto.quoteDeadline),
      businessUnit: dto.businessUnit,
      branchPlant: dto.branchPlant,
      customerId: dto.customerId,
      consigneeId: dto.consigneeId,
      supplierId: dto.supplierId,
      buyerId: dto.buyerId,
      salesOrderNo: dto.salesOrderNo,
      customerPoNo: dto.customerPoNo,
      supplierInvoiceNo: dto.supplierInvoiceNo,
      poNumbers: dto.poNumbers,
      commodity: dto.commodity,
      hsCode: dto.hsCode,
      natureOfCargo: dto.natureOfCargo,
      packageType: dto.packageType,
      packageCount: dto.packageCount,
      netWeightKg: dto.netWeightKg,
      cargoValue: dto.cargoValue,
      cargoCurrency: dto.cargoCurrency,
      priority: dto.priority,
      pickupAddress: dto.pickupAddress,
      deliveryAddress: dto.deliveryAddress,
      finalDestination: dto.finalDestination,
      stuffingLocation: dto.stuffingLocation,
      factoryStuffing: dto.factoryStuffing,
      serviceScope: dto.serviceScope,
      serviceOptions: dto.serviceOptions as Prisma.InputJsonValue | undefined,
      preferredShippingLine: dto.preferredShippingLine,
      preferredVessel: dto.preferredVessel,
      directServiceOnly: dto.directServiceOnly,
      transshipmentAllowed: dto.transshipmentAllowed,
      maxTransitDays: dto.maxTransitDays,
      etdRequired: d(dto.etdRequired),
      etaRequired: d(dto.etaRequired),
      quoteValidityDate: d(dto.quoteValidityDate),
      sailingRequiredBefore: d(dto.sailingRequiredBefore),
      incotermDetails: dto.incotermDetails as Prisma.InputJsonValue | undefined,
      specialInstructions: dto.specialInstructions,
      internalRemarks: dto.internalRemarks,
    };
  }

  // Auto-derives volume, volumetric weight and chargeable weight from the
  // dimension rows and mode (air/courier volumetric divisor; LCL freight ton).
  private deriveWeights(dto: Partial<CreateEnquiryDto>) {
    let volumeCbm = dto.volumeCbm;
    let volumetricWeight: number | undefined;
    let chargeableWeight = dto.chargeableWeight;

    if (dto.dimensions && dto.dimensions.length) {
      const totalCm3 = dto.dimensions.reduce(
        (s, d) => s + d.lengthCm * d.widthCm * d.heightCm * d.qty,
        0,
      );
      volumeCbm = round3(totalCm3 / 1_000_000);
      const divisor = dto.mode === ShipmentMode.COURIER ? 5000 : 6000;
      volumetricWeight = round3(totalCm3 / divisor);
    }

    const gross = dto.weightKg;
    if (dto.mode === ShipmentMode.AIR || dto.mode === ShipmentMode.COURIER) {
      if (gross != null || volumetricWeight != null)
        chargeableWeight = round3(Math.max(gross ?? 0, volumetricWeight ?? 0));
    } else if (dto.mode === ShipmentMode.LCL) {
      if (volumeCbm != null || gross != null)
        chargeableWeight = round3(Math.max(volumeCbm ?? 0, (gross ?? 0) / 1000));
    }

    const out: {
      volumeCbm?: number;
      volumetricWeight?: number;
      chargeableWeight?: number;
    } = {};
    if (volumeCbm != null) out.volumeCbm = volumeCbm;
    if (volumetricWeight != null) out.volumetricWeight = volumetricWeight;
    if (chargeableWeight != null) out.chargeableWeight = chargeableWeight;
    return out;
  }

  private dimData = (d: {
    label?: string;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    qty: number;
  }) => ({
    label: d.label ?? null,
    lengthCm: d.lengthCm,
    widthCm: d.widthCm,
    heightCm: d.heightCm,
    qty: d.qty,
  });

  private containerData = (c: {
    containerType: string;
    qty: number;
    estWeightKg?: number;
  }) => ({
    containerType: c.containerType,
    qty: c.qty,
    estWeightKg: c.estWeightKg ?? null,
  });

  private async nextEnquiryNo(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ENQ-${year}-`;
    const last = await tx.enquiry.findFirst({
      where: { enquiryNo: { startsWith: prefix } },
      orderBy: { enquiryNo: 'desc' },
      select: { enquiryNo: true },
    });
    let seq = 1;
    if (last) {
      const n = parseInt(last.enquiryNo.slice(prefix.length), 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
  }

  private computeExpiry(deadline: Date | null): Date {
    const base = deadline ?? new Date(Date.now() + 14 * 24 * 3600 * 1000);
    return new Date(base.getTime() + graceHours() * 3600 * 1000);
  }

  // The signed-in user (from the request context set by the login cookie);
  // falls back to a seed user if somehow unauthenticated.
  private async actingUser() {
    const ctx = getReqCtx();
    if (ctx?.userId) {
      const u = await this.prisma.user.findFirst({
        where: { id: ctx.userId, isActive: true },
      });
      if (u) return u;
    }
    const user = await this.prisma.user.findFirst({
      where: { role: { in: ['LOGISTICS', 'ADMIN'] }, isActive: true },
      orderBy: { role: 'asc' },
    });
    if (!user) {
      throw new BadRequestException(
        'No acting Logistics/Admin user found — seed users first',
      );
    }
    return user;
  }
}
