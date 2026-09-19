import { test, expect, Page } from '@playwright/test';
import { readFileSync, statSync } from 'fs';
import { API, firstTwoVendorIds, getInviteTokens, locationId } from './helpers';

async function exportVia(page: Page, label: string) {
  await page.getByRole('button', { name: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: label }).click(),
  ]);
  return download;
}

test('comparison exports download as CSV, Excel and PDF', async ({
  request,
  page,
}) => {
  const origin = await locationId(request, 'BOM');
  const destination = await locationId(request, 'DXB');
  const [vendorId] = await firstTwoVendorIds(request);

  const enquiry = await (
    await request.post(`${API}/enquiries`, {
      data: {
        direction: 'EXPORT',
        mode: 'AIR',
        originId: origin,
        destinationId: destination,
        chargeableWeight: 100,
      },
    })
  ).json();
  await request.post(`${API}/enquiries/${enquiry.id}/vendors`, {
    data: { vendorIds: [vendorId] },
  });
  await request.post(`${API}/enquiries/${enquiry.id}/send`);
  const [{ token }] = await getInviteTokens(enquiry.id);
  await request.put(`${API}/portal/${token}/quotation`, {
    data: { currency: 'INR', lines: [{ description: 'Freight', qty: 100, rate: 100 }] },
  });
  await request.post(`${API}/portal/${token}/submit`);

  await page.goto(`/app/enquiries/${enquiry.id}/compare`);

  // CSV — check content
  const csv = await exportVia(page, 'Download CSV');
  expect(csv.suggestedFilename()).toBe(`lprms-comparison-${enquiry.enquiryNo}.csv`);
  const csvText = readFileSync(await csv.path(), 'utf8');
  expect(csvText).toContain('Freight');
  expect(csvText).toContain('10000');

  // Excel — check it's a real, non-trivial .xlsx (ZIP magic "PK")
  const xlsx = await exportVia(page, 'Download Excel');
  expect(xlsx.suggestedFilename()).toBe(`lprms-comparison-${enquiry.enquiryNo}.xlsx`);
  const xlsxPath = await xlsx.path();
  expect(statSync(xlsxPath).size).toBeGreaterThan(2000);
  expect(readFileSync(xlsxPath).subarray(0, 2).toString()).toBe('PK');

  // PDF — check it's a real PDF (magic "%PDF")
  const pdf = await exportVia(page, 'Download PDF (branded)');
  expect(pdf.suggestedFilename()).toBe(`lprms-comparison-${enquiry.enquiryNo}.pdf`);
  const pdfPath = await pdf.path();
  expect(statSync(pdfPath).size).toBeGreaterThan(3000);
  expect(readFileSync(pdfPath).subarray(0, 4).toString()).toBe('%PDF');
});
