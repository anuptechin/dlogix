export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  money?: boolean;
}

/**
 * Build a styled .xlsx (navy header row, currency formatting) and download it.
 * ExcelJS is dynamically imported so it only loads when someone exports.
 */
export async function exportExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LPRMS';
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 20,
  }));

  const header = ws.getRow(1);
  header.height = 20;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF12263F' },
    };
    cell.alignment = { vertical: 'middle' };
  });

  rows.forEach((r) => ws.addRow(r));

  columns.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = '#,##0.00';
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
