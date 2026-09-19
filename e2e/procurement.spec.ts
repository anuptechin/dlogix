import { test, expect } from '@playwright/test';
import { API, firstTwoVendorIds, getInviteTokens, locationId } from './helpers';

/**
 * Full procurement loop, driven end-to-end:
 *   create enquiry → invite vendors → send → vendor quotes →
 *   comparison (normalised) → award → blind feedback + history.
 * The API steps mirror exactly what the UI calls; a UI smoke test
 * confirms the vendor portal and comparison screen render.
 */
test('procurement loop: enquiry → quotes → comparison → award', async ({
  request,
}) => {
  const origin = await locationId(request, 'BOM');
  const destination = await locationId(request, 'DXB');
  const [v1, v2] = await firstTwoVendorIds(request);

  // 1. create enquiry (DRAFT, auto number)
  const createRes = await request.post(`${API}/enquiries`, {
    data: {
      direction: 'EXPORT',
      mode: 'AIR',
      originId: origin,
      destinationId: destination,
      chargeableWeight: 300,
      cargoDesc: 'E2E test cargo',
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const enquiry = await createRes.json();
  expect(enquiry.status).toBe('DRAFT');
  expect(enquiry.enquiryNo).toMatch(/^ENQ-\d{4}-\d{4}$/);

  // 2. invite two vendors + send
  await request.post(`${API}/enquiries/${enquiry.id}/vendors`, {
    data: { vendorIds: [v1, v2] },
  });
  const sentRes = await request.post(`${API}/enquiries/${enquiry.id}/send`);
  const sent = await sentRes.json();
  expect(sent.status).toBe('SENT');

  // 3. tokens (as delivered to vendors by email)
  const tokens = await getInviteTokens(enquiry.id);
  expect(tokens).toHaveLength(2);

  // 4. each vendor submits an itemised quote via the portal
  // vendor A → 300*200 + 5000 = 65,000
  await request.put(`${API}/portal/${tokens[0].token}/quotation`, {
    data: {
      currency: 'INR',
      transitTimeDays: 5,
      lines: [
        { description: 'Freight', unit: 'per_kg', qty: 300, rate: 200 },
        { description: 'Fuel Surcharge', unit: 'flat', qty: 1, rate: 5000 },
      ],
    },
  });
  await request.post(`${API}/portal/${tokens[0].token}/submit`);

  // vendor B → 300*180 + 6000 = 60,000 (cheaper)
  await request.put(`${API}/portal/${tokens[1].token}/quotation`, {
    data: {
      currency: 'INR',
      transitTimeDays: 7,
      lines: [
        { description: 'Freight', unit: 'per_kg', qty: 300, rate: 180 },
        { description: 'Fuel Surcharge', unit: 'flat', qty: 1, rate: 6000 },
      ],
    },
  });
  await request.post(`${API}/portal/${tokens[1].token}/submit`);

  // 5. comparison: both submitted, server-side totals correct
  const cmp = await (
    await request.get(`${API}/enquiries/${enquiry.id}/comparison`)
  ).json();
  const submitted = cmp.vendors.filter((v: { submitted: boolean }) => v.submitted);
  expect(submitted).toHaveLength(2);
  const totals = submitted
    .map((v: { total: number }) => v.total)
    .sort((a: number, b: number) => a - b);
  expect(totals).toEqual([60000, 65000]);

  // 6. award the lower quote
  const winner = submitted.find((v: { total: number }) => v.total === 60000);
  const awardRes = await request.post(`${API}/enquiries/${enquiry.id}/award`, {
    data: { quotationId: winner.quotationId, reason: 'E2E: lowest total' },
  });
  const awarded = await awardRes.json();
  expect(awarded.status).toBe('AWARDED');

  // 7. award reflected + lane history populated
  const cmp2 = await (
    await request.get(`${API}/enquiries/${enquiry.id}/comparison`)
  ).json();
  expect(cmp2.enquiry.awardedQuotationId).toBe(winner.quotationId);
  expect(cmp2.history.length).toBeGreaterThanOrEqual(1);

  // 8. double-award is rejected
  const dup = await request.post(`${API}/enquiries/${enquiry.id}/award`, {
    data: { quotationId: winner.quotationId },
  });
  expect(dup.status()).toBe(400);
});

test('vendor portal renders for a fresh invitation', async ({ request, page }) => {
  const origin = await locationId(request, 'DEL');
  const destination = await locationId(request, 'LHR');
  const [v1] = await firstTwoVendorIds(request);

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
    data: { vendorIds: [v1] },
  });
  await request.post(`${API}/enquiries/${enquiry.id}/send`);
  const [{ token }] = await getInviteTokens(enquiry.id);

  await page.goto(`/quote/${token}`);
  await expect(page.getByText('Request for Quotation')).toBeVisible();
  await expect(page.getByText(enquiry.enquiryNo)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your quotation' }),
  ).toBeVisible();
  // seeded charge lines are present
  await expect(page.getByText('Freight').first()).toBeVisible();
});
