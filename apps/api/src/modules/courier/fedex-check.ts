import ExcelJS from 'exceljs';

// Fixed columns in the FedEx monthly report sheets (as specified):
//   C (3) = AWB   J (10) = Country (destination)   M (13) = Dimwgt (final weight)
//   Q (17) = Subtotal (base rate)   L (12) = Weight (fallback when Dimwgt blank)
// We still verify the sheet's J/M/Q headers are Country/Dimwgt/Subtotal so the
// non-data sheets (IMPORT Shipment, Duty & Tax) are skipped.
const COL = { awb: 3, dest: 10, weight: 13, actualWeight: 12, base: 17 } as const;

export interface FedexReportRow {
  sheet: string;
  awb: string;
  destCountry: string;
  finalWt: number;
  reportedBase: number;
}

function cellNum(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    const o = v as { result?: ExcelJS.CellValue; text?: string };
    if ('result' in o) return cellNum(o.result ?? null);
    if ('text' in o) return cellNum(o.text ?? null);
  }
  const n = Number(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function cellStr(v: ExcelJS.CellValue): string | null {
  if (v == null) return null;
  if (typeof v === 'object') {
    const o = v as { result?: ExcelJS.CellValue; text?: string; richText?: { text: string }[] };
    if ('richText' in o && o.richText) return o.richText.map((t) => t.text).join('').trim() || null;
    if ('result' in o) return cellStr(o.result ?? null);
    if ('text' in o) return String(o.text).trim() || null;
  }
  const s = String(v).trim();
  return s || null;
}

/** True if this worksheet looks like a monthly FedEx report (J/M/Q headers). */
function isReportSheet(ws: ExcelJS.Worksheet): boolean {
  const header = ws.getRow(1);
  const j = (cellStr(header.getCell(COL.dest).value) ?? '').toLowerCase();
  const m = (cellStr(header.getCell(COL.weight).value) ?? '').toLowerCase();
  const q = (cellStr(header.getCell(COL.base).value) ?? '').toLowerCase();
  return j.includes('country') && m.includes('dimwgt') && q.includes('subtotal');
}

/** Read every report sheet and extract destination / final weight / reported base. */
export async function parseFedexReport(buffer: Buffer): Promise<FedexReportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const out: FedexReportRow[] = [];

  wb.eachSheet((ws) => {
    if (!isReportSheet(ws)) return;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const awb = cellStr(row.getCell(COL.awb).value) ?? '';
      const destCountry = cellStr(row.getCell(COL.dest).value);
      const finalWt = cellNum(row.getCell(COL.weight).value) ?? cellNum(row.getCell(COL.actualWeight).value);
      const reportedBase = cellNum(row.getCell(COL.base).value);
      if (!destCountry || !finalWt || finalWt <= 0 || reportedBase == null) continue;
      out.push({ sheet: ws.name, awb, destCountry, finalWt, reportedBase });
    }
  });
  return out;
}

export type CheckStatus = 'CORRECT' | 'INCORRECT' | 'NO_ZONE' | 'NO_RATE';

export interface FedexCheckRow extends FedexReportRow {
  zone: string | null;
  expectedBase: number | null;
  diff: number | null;
  status: CheckStatus;
}

export interface FedexCheckResult {
  rows: FedexCheckRow[];
  summary: { total: number; correct: number; incorrect: number; noZone: number; noRate: number };
}
