import { APIRequestContext, expect } from '@playwright/test';
import { Client } from 'pg';

export const API = process.env.API_BASE_URL ?? 'http://localhost:3093';
const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://lprms:lprms_dev_pw@localhost:5432/lprms';

/** Read the invite tokens for an enquiry the way vendors receive them (via email). */
export async function getInviteTokens(
  enquiryId: string,
): Promise<{ vendorId: string; token: string }[]> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const res = await client.query(
      'SELECT vendor_id, invite_token FROM enquiry_vendors WHERE enquiry_id = $1 ORDER BY invited_at',
      [enquiryId],
    );
    return res.rows.map((r) => ({ vendorId: r.vendor_id, token: r.invite_token }));
  } finally {
    await client.end();
  }
}

export async function firstTwoVendorIds(request: APIRequestContext) {
  const res = await request.get(`${API}/vendors?active=true`);
  expect(res.ok()).toBeTruthy();
  const vendors = await res.json();
  expect(vendors.length).toBeGreaterThanOrEqual(2);
  return [vendors[0].id, vendors[1].id] as const;
}

export async function locationId(request: APIRequestContext, code: string) {
  const res = await request.get(`${API}/locations`);
  const locations = await res.json();
  const found = locations.find(
    (l: { code?: string }) => l.code === code,
  );
  expect(found, `location ${code} should be seeded`).toBeTruthy();
  return found.id as string;
}
