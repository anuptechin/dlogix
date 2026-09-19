import { test, expect } from '@playwright/test';
import { API, firstTwoVendorIds, getInviteTokens, locationId } from './helpers';

const SCRATCH =
  'C:/Users/ANUPAM~1.KUM/AppData/Local/Temp/claude/C--Dev-Logistic-System/11d6b5a0-f9e3-41f5-9bee-58386c742951/scratchpad';

test('Air vs Courier panel flags courier as cheaper', async ({ request, page }) => {
  const origin = await locationId(request, 'DEL');
  const destination = await locationId(request, 'LHR');
  const [vendorId] = await firstTwoVendorIds(request);
  const service = `AVC Courier ${Date.now()}`;

  // A cheap courier rate card for the Europe zone.
  await request.post(`${API}/courier/contracts`, {
    data: {
      vendorId,
      serviceName: service,
      direction: 'EXPORT',
      currency: 'INR',
      isActive: true,
      slabs: [
        { destinationZone: 'Europe', weightFromKg: 0, weightToKg: 1000, flatRate: 40000 },
      ],
      surcharges: [],
      transits: [{ destinationZone: 'Europe', transitDays: 4 }],
    },
  });

  // An air enquiry with a single submitted quote at 65,000.
  const enquiry = await (
    await request.post(`${API}/enquiries`, {
      data: {
        direction: 'EXPORT',
        mode: 'AIR',
        originId: origin,
        destinationId: destination,
        chargeableWeight: 250,
      },
    })
  ).json();
  await request.post(`${API}/enquiries/${enquiry.id}/vendors`, {
    data: { vendorIds: [vendorId] },
  });
  await request.post(`${API}/enquiries/${enquiry.id}/send`);
  const [{ token }] = await getInviteTokens(enquiry.id);
  await request.put(`${API}/portal/${token}/quotation`, {
    data: {
      currency: 'INR',
      lines: [
        { description: 'Freight', qty: 250, rate: 240 }, // 60,000
        { description: 'Fuel', qty: 1, rate: 5000 }, //      5,000
      ],
    },
  });
  await request.post(`${API}/portal/${token}/submit`);

  // Comparison → Air vs Courier panel.
  await page.goto(`/app/enquiries/${enquiry.id}/compare`);
  const selectors = page.locator('.ant-select-selector');
  await selectors.nth(0).click();
  await page.locator('.ant-select-item-option').filter({ hasText: service }).first().click();
  await selectors.nth(1).click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Europe' }).first().click();

  await expect(page.getByText('Courier cost')).toBeVisible();
  // courier 40,000 vs lowest quote 65,000 → cheaper by 25,000
  await expect(page.getByText(/cheaper by\s+₹25,000/)).toBeVisible();

  await page.screenshot({ path: `${SCRATCH}/air_vs_courier.png`, fullPage: true });
});
