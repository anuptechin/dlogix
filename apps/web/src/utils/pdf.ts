import type { Comparison } from '../api/client';

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (v: number | null | undefined, cur = 'INR') =>
  v == null
    ? '—'
    : `${SYMBOL[cur] ?? cur + ' '}${v.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

async function logoDataUrl(): Promise<string | undefined> {
  try {
    const res = await fetch('/ddecor-logo.png');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function getPdfMake(): Promise<any> {
  const mod: any = await import('pdfmake/build/pdfmake');
  const fonts: any = await import('pdfmake/build/vfs_fonts');
  const pdfMake = mod.default ?? mod;
  pdfMake.vfs =
    fonts.default?.pdfMake?.vfs ??
    fonts.pdfMake?.vfs ??
    fonts.default?.vfs ??
    fonts.vfs;
  return pdfMake;
}

/** Branded PDF of the quote comparison sheet. */
export async function exportComparisonPdf(cmp: Comparison): Promise<void> {
  const pdfMake = await getPdfMake();
  const logo = await logoDataUrl();

  const e = cmp.enquiry;
  const vendors = cmp.vendors;
  const submitted = vendors.filter((v) => v.submitted);
  const awardedQid = e.awardedQuotationId ?? null;
  const lowest = submitted.length
    ? Math.min(...submitted.map((v) => v.total ?? Infinity))
    : null;
  const winnerId =
    awardedQid ??
    (lowest != null
      ? submitted.find((v) => v.total === lowest)?.quotationId ?? null
      : null);
  const winner = vendors.find((v) => v.quotationId === winnerId);

  const winFill = awardedQid ? '#f3ecdd' : '#e6f2f1';
  const winHead = awardedQid ? '#9a6f1f' : '#0e5b5a';

  const cell = (text: string, isWin: boolean, style: string) => ({
    text,
    style,
    ...(isWin ? { fillColor: winFill } : {}),
  });

  const headerRow = [
    { text: 'Charge', style: 'thLeft' },
    ...vendors.map((v) => ({
      text: v.name,
      style: 'th',
      ...(v.quotationId === winnerId ? { fillColor: winHead } : {}),
    })),
  ];
  const bodyRows = cmp.chargeTypes.map((ct) => [
    { text: ct.name, style: 'rowhead' },
    ...vendors.map((v) =>
      cell(
        v.submitted && v.lines[ct.id] != null ? money(v.lines[ct.id], v.currency) : '—',
        v.quotationId === winnerId,
        'num',
      ),
    ),
  ]);
  const totalRow = [
    { text: 'Total', style: 'totalHead' },
    ...vendors.map((v) =>
      cell(
        v.submitted ? money(v.total, v.currency) : 'Awaiting',
        v.quotationId === winnerId,
        'total',
      ),
    ),
  ];
  const transitRow = [
    { text: 'Transit (days)', style: 'rowhead' },
    ...vendors.map((v) =>
      cell(v.transitTimeDays != null ? String(v.transitTimeDays) : '—', false, 'num'),
    ),
  ];
  const validRow = [
    { text: 'Valid until', style: 'rowhead' },
    ...vendors.map((v) =>
      cell(v.validUntil ? String(v.validUntil).slice(0, 10) : '—', false, 'num'),
    ),
  ];

  const note = winner
    ? awardedQid
      ? `Awarded to ${winner.name} at ${money(winner.total, winner.currency)}.`
      : `Lowest total: ${money(winner.total, winner.currency)} from ${winner.name}.`
    : 'No quotations submitted yet.';

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: vendors.length > 4 ? 'landscape' : 'portrait',
    pageMargins: [36, 84, 36, 46],
    header: {
      margin: [36, 22, 36, 0],
      columns: [
        logo ? { image: logo, width: 84 } : { text: '' },
        {
          text: 'Quote Comparison',
          alignment: 'right',
          color: '#12263f',
          bold: true,
          fontSize: 15,
          margin: [0, 12, 0, 0],
        },
      ],
    },
    footer: (page: number, count: number) => ({
      margin: [36, 8, 36, 0],
      columns: [
        {
          text: "D'Decor · Logistics Procurement & Rate Management · Confidential",
          fontSize: 8,
          color: '#93a4b4',
        },
        {
          text: `Page ${page} of ${count}`,
          alignment: 'right',
          fontSize: 8,
          color: '#93a4b4',
        },
      ],
    }),
    content: [
      { text: e.enquiryNo, fontSize: 19, bold: true, color: '#12263f' },
      {
        text: `${e.direction} · ${e.mode} · ${e.origin?.code ?? '-'} -> ${
          e.destination?.code ?? '-'
        }${e.chargeableWeight ? ` · CW ${e.chargeableWeight} kg` : ''}`,
        color: '#64788c',
        margin: [0, 2, 0, 10],
      },
      {
        text: note,
        margin: [0, 0, 0, 12],
        bold: true,
        color: awardedQid ? '#8a5f16' : '#0a5b5a',
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', ...vendors.map(() => 'auto')],
          body: [headerRow, ...bodyRows, totalRow, transitRow, validRow],
        },
        layout: {
          hLineColor: () => '#e4eaf0',
          vLineColor: () => '#e4eaf0',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
      },
    ],
    styles: {
      th: { bold: true, color: '#ffffff', fillColor: '#12263f', fontSize: 9, alignment: 'right' },
      thLeft: { bold: true, color: '#ffffff', fillColor: '#12263f', fontSize: 9 },
      rowhead: { color: '#16222e', fontSize: 9 },
      num: { alignment: 'right', fontSize: 9, color: '#16222e' },
      total: { alignment: 'right', bold: true, fontSize: 10, color: '#12263f' },
      totalHead: { bold: true, fontSize: 10, color: '#12263f' },
    },
    defaultStyle: { fontSize: 9 },
  };

  pdfMake.createPdf(docDefinition).download(`lprms-comparison-${e.enquiryNo}.pdf`);
}
