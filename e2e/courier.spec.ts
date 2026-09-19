import { test, expect } from '@playwright/test';
import { API, firstTwoVendorIds } from './helpers';

const SCRATCH =
  'C:/Users/ANUPAM~1.KUM/AppData/Local/Temp/claude/C--Dev-Logistic-System/11d6b5a0-f9e3-41f5-9bee-58386c742951/scratchpad';

test('courier calculator computes a cost through the UI', async ({
  request,
  page,
}) => {
  const [vendorId] = await firstTwoVendorIds(request);
  const service = `E2E Courier ${Date.now()}`;

  // Seed a fresh rate card via API.
  const contract = await (
    await request.post(`${API}/courier/contracts`, {
      data: {
        vendorId,
        serviceName: service,
        direction: 'EXPORT',
        currency: 'INR',
        isActive: true,
        slabs: [
          { destinationZone: 'Europe', weightFromKg: 5, weightToKg: 100, ratePerKg: 540, minCharge: 3500 },
        ],
        surcharges: [
          { type: 'FUEL_PCT', label: 'Fuel surcharge', value: 16, isPercentage: true },
          { type: 'REMOTE_AREA', label: 'Remote area', value: 650, isPercentage: false },
        ],
        transits: [{ destinationZone: 'Europe', transitDays: 5 }],
      },
    })
  ).json();
  expect(contract.id).toBeTruthy();

  // Drive the calculator UI.
  await page.goto('/app/courier/calculator');
  const selectors = page.locator('.ant-select-selector');

  // service
  await selectors.nth(0).click();
  await page
    .locator('.ant-select-item-option')
    .filter({ hasText: service })
    .first()
    .click();
  await expect(
    page.locator('.ant-select-selection-item').filter({ hasText: service }),
  ).toBeVisible();

  // zone (enabled once a service is chosen)
  await selectors.nth(1).click();
  await page
    .locator('.ant-select-item-option')
    .filter({ hasText: 'Europe' })
    .first()
    .click();

  await page.getByRole('spinbutton').first().fill('12');
  await page.getByRole('button', { name: 'Calculate cost' }).click();

  // 12 × 540 = 6480 base; +16% fuel (1036.80) + 650 = 8166.80 total.
  await expect(page.getByText('Total cost')).toBeVisible();
  await expect(page.getByText('₹8,166.80').first()).toBeVisible();
  await expect(page.getByText('5 days')).toBeVisible();

  await page.screenshot({ path: `${SCRATCH}/courier_calc_result.png`, fullPage: true });
});
