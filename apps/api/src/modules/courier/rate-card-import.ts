import ExcelJS from 'exceljs';
import { CourierCarrier } from '@prisma/client';

export interface ParsedZone {
  country: string;
  zone: string;
}
export interface ParsedRate {
  weightKg: number;
  zone: string;
  price: number;
  perKg: boolean;
}
export interface ParsedCard {
  carrier: CourierCarrier;
  flatMaxWeightKg: number;
  zones: ParsedZone[];
  rates: ParsedRate[];
}

// Per-carrier layout of the D'Decor "Courier Rates" workbook.
const LAYOUT = {
  DHL: {
    carrier: CourierCarrier.DHL,
    zoneSheet: 'DHL ZONE LIST',
    zoneCol: 2, // column B = zone
    priceSheet: 'DHL PRICES',
    flatMax: 30,
  },
  FEDEX: {
    carrier: CourierCarrier.FEDEX,
    zoneSheet: 'FEDEX ZONE LIST',
    zoneCol: 2, // column B = current zone (col C = 2021, ignored)
    priceSheet: 'FEDEX PRICE',
    flatMax: 70.5,
  },
} as const;

const cellStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object' && 'result' in (v as any))
    return String((v as any).result ?? '').trim();
  if (typeof v === 'object' && 'text' in (v as any))
    return String((v as any).text ?? '').trim();
  return String(v).trim();
};
const cellNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  if (typeof v === 'object' && 'result' in (v as any)) v = (v as any).result;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
// numbers like 1.0 → "1"; keep letters/other as-is
const normZone = (v: unknown): string => {
  const s = cellStr(v);
  const n = Number(s);
  if (s !== '' && Number.isFinite(n)) return String(n % 1 === 0 ? n : n);
  return s;
};

function parseZones(ws: ExcelJS.Worksheet, zoneCol: number): ParsedZone[] {
  const out: ParsedZone[] = [];
  const seen = new Set<string>();
  ws.eachRow((row, r) => {
    if (r === 1) return; // header
    const country = cellStr(row.getCell(1).value);
    const zone = normZone(row.getCell(zoneCol).value);
    if (!country || !zone || zone === '#N/A' || zone.toUpperCase() === 'NA') return;
    const key = country.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ country, zone });
  });
  return out;
}

function parsePrices(ws: ExcelJS.Worksheet, flatMax: number): ParsedRate[] {
  // Row 1: col1 = "Weight", other columns = zone labels.
  const header = ws.getRow(1);
  const zoneByCol = new Map<number, string>();
  header.eachCell((cell, c) => {
    if (c === 1) return;
    const label = normZone(cell.value);
    if (label && label.toLowerCase() !== 'weight') zoneByCol.set(c, label);
  });

  const out: ParsedRate[] = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const weightKg = cellNum(row.getCell(1).value);
    if (weightKg == null) return;
    const perKg = weightKg > flatMax;
    for (const [c, zone] of zoneByCol) {
      const price = cellNum(row.getCell(c).value);
      if (price == null) continue;
      out.push({ weightKg, zone, price, perKg });
    }
  });
  return out;
}

/** Parse the workbook buffer into DHL + FedEx rate cards. */
export async function parseRateCardWorkbook(buffer: Buffer): Promise<ParsedCard[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs's Buffer typing differs from Node's; cast is safe.
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const cards: ParsedCard[] = [];
  for (const key of ['DHL', 'FEDEX'] as const) {
    const cfg = LAYOUT[key];
    const zoneWs = wb.getWorksheet(cfg.zoneSheet);
    const priceWs = wb.getWorksheet(cfg.priceSheet);
    if (!zoneWs || !priceWs) continue;
    cards.push({
      carrier: cfg.carrier,
      flatMaxWeightKg: cfg.flatMax,
      zones: parseZones(zoneWs, cfg.zoneCol),
      rates: parsePrices(priceWs, cfg.flatMax),
    });
  }
  return cards;
}
