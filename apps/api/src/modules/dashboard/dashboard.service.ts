import { Injectable } from '@nestjs/common';
import { EnquiryStatus, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const num = (v: unknown) => (v == null ? 0 : Number(v));

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      totalEnquiries,
      byStatusRaw,
      awardAgg,
      activeVendors,
      activeContracts,
      submittedQuotes,
      invitedCount,
      spendByModeRaw,
      history,
      invitedByVendor,
      quotedRows,
      wonByVendor,
      vendors,
      expiringRaw,
    ] = await Promise.all([
      this.prisma.enquiry.count(),
      this.prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.award.aggregate({
        _count: { _all: true },
        _sum: { awardedAmount: true },
      }),
      this.prisma.vendor.count({ where: { isActive: true } }),
      this.prisma.courierContract.count({ where: { isActive: true } }),
      this.prisma.quotation.count({ where: { status: QuoteStatus.SUBMITTED } }),
      this.prisma.enquiryVendor.count(),
      this.prisma.shipmentHistory.groupBy({
        by: ['mode'],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.shipmentHistory.findMany({
        include: {
          vendor: { select: { name: true } },
          enquiry: {
            select: {
              enquiryNo: true,
              origin: { select: { code: true } },
              destination: { select: { code: true } },
            },
          },
        },
        orderBy: { awardedAt: 'desc' },
        take: 6,
      }),
      this.prisma.enquiryVendor.groupBy({
        by: ['vendorId'],
        _count: { _all: true },
      }),
      this.prisma.enquiryVendor.findMany({
        where: { quotation: { status: QuoteStatus.SUBMITTED } },
        select: { vendorId: true },
      }),
      this.prisma.shipmentHistory.groupBy({
        by: ['vendorId'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.vendor.findMany({ select: { id: true, name: true } }),
      this.prisma.courierContract.findMany({
        where: {
          isActive: true,
          validTo: {
            not: null,
            lte: new Date(Date.now() + 60 * 24 * 3600 * 1000),
          },
        },
        include: { vendor: { select: { name: true } } },
        orderBy: { validTo: 'asc' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(EnquiryStatus)) byStatus[s] = 0;
    for (const r of byStatusRaw) byStatus[r.status] = r._count._all;

    const quotedCount: Record<string, number> = {};
    for (const q of quotedRows)
      quotedCount[q.vendorId] = (quotedCount[q.vendorId] ?? 0) + 1;
    const invitedMap = new Map(
      invitedByVendor.map((i) => [i.vendorId, i._count._all]),
    );
    const wonMap = new Map(
      wonByVendor.map((w) => [
        w.vendorId,
        { won: w._count._all, value: num(w._sum.amount) },
      ]),
    );

    const vendorPerformance = vendors
      .map((v) => {
        const invited = invitedMap.get(v.id) ?? 0;
        const quoted = quotedCount[v.id] ?? 0;
        const won = wonMap.get(v.id)?.won ?? 0;
        return {
          vendorId: v.id,
          name: v.name,
          invited,
          quoted,
          won,
          awardedValue: wonMap.get(v.id)?.value ?? 0,
          winRate: quoted ? Math.round((won / quoted) * 100) : 0,
        };
      })
      .filter((v) => v.invited > 0)
      .sort((a, b) => b.awardedValue - a.awardedValue);

    const now = Date.now();

    return {
      kpis: {
        totalEnquiries,
        awarded: awardAgg._count._all,
        awardedValue: num(awardAgg._sum.awardedAmount),
        activeVendors,
        activeContracts,
        responseRate: invitedCount
          ? Math.round((submittedQuotes / invitedCount) * 100)
          : 0,
      },
      byStatus,
      spendByMode: spendByModeRaw
        .map((r) => ({
          mode: r.mode ?? 'UNKNOWN',
          amount: num(r._sum.amount),
          count: r._count._all,
        }))
        .sort((a, b) => b.amount - a.amount),
      vendorPerformance,
      recentAwards: history.map((h) => ({
        enquiryNo: h.enquiry?.enquiryNo ?? '—',
        vendor: h.vendor?.name ?? '—',
        mode: h.mode,
        route: `${h.enquiry?.origin?.code ?? '—'} → ${h.enquiry?.destination?.code ?? '—'}`,
        amount: num(h.amount),
        currency: h.currency ?? 'INR',
        awardedAt: h.awardedAt,
      })),
      expiringContracts: expiringRaw.map((c) => ({
        id: c.id,
        serviceName: c.serviceName,
        vendor: c.vendor.name,
        validTo: c.validTo,
        daysLeft: c.validTo
          ? Math.ceil((c.validTo.getTime() - now) / (24 * 3600 * 1000))
          : null,
      })),
    };
  }
}
