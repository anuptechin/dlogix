import {
  PrismaClient,
  UserRole,
  ShipmentMode,
  ChargeCategory,
  PartyRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

// Dev password for all seed accounts (login is interim until M365 SSO).
const DEV_PASSWORD = 'Dlogix@123';

const prisma = new PrismaClient();
const ALL_MODES = [
  ShipmentMode.AIR,
  ShipmentMode.LCL,
  ShipmentMode.FCL,
  ShipmentMode.COURIER,
];
const SEA = [ShipmentMode.LCL, ShipmentMode.FCL];

async function main() {
  console.log('Seeding LPRMS reference data…');

  // ─── Users (map to real M365 accounts later via entraObjectId) ───
  const users = [
    { name: 'Logistics User', email: 'logistics@ddecor.com', role: UserRole.LOGISTICS },
    { name: 'Documentation User', email: 'docs@ddecor.com', role: UserRole.DOCUMENTATION },
    { name: 'Management User', email: 'management@ddecor.com', role: UserRole.MANAGEMENT },
    { name: 'Admin User', email: 'admin@ddecor.com', role: UserRole.ADMIN },
  ];
  const passwordHash = bcrypt.hashSync(DEV_PASSWORD, 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { ...u, passwordHash },
    });
  }

  // ─── Locations (sample; replace with the real master list) ───
  const locations = [
    { kind: 'AIRPORT', code: 'BOM', name: 'Mumbai (CSMIA)', country: 'India' },
    { kind: 'AIRPORT', code: 'DEL', name: 'Delhi (IGI)', country: 'India' },
    { kind: 'PORT', code: 'INNSA', name: 'Nhava Sheva (JNPT)', country: 'India' },
    { kind: 'PORT', code: 'USNYC', name: 'New York', country: 'USA' },
    { kind: 'AIRPORT', code: 'FRA', name: 'Frankfurt', country: 'Germany' },
    { kind: 'AIRPORT', code: 'LHR', name: 'London Heathrow', country: 'UK' },
    { kind: 'PORT', code: 'DEHAM', name: 'Hamburg', country: 'Germany' },
    { kind: 'CITY', code: 'DXB', name: 'Dubai', country: 'UAE' },
    { kind: 'ICD', code: 'INTKD', name: 'ICD Tughlakabad', country: 'India' },
    { kind: 'CFS', code: 'INMUM-CFS', name: 'Mumbai CFS', country: 'India' },
  ];
  for (const l of locations) {
    const existing = await prisma.portLocation.findFirst({ where: { code: l.code } });
    if (!existing) await prisma.portLocation.create({ data: l });
  }

  // ─── Charge types (BRD "Charges Required" checklists), with landed-cost category ───
  const F = ChargeCategory.FREIGHT;
  const O = ChargeCategory.ORIGIN;
  const D = ChargeCategory.DESTINATION;
  const L = ChargeCategory.LOCAL;
  const OTH = ChargeCategory.OTHER;
  const chargeTypes: {
    name: string;
    unit: string;
    category: ChargeCategory;
    appliesToMode: ShipmentMode[];
  }[] = [
    { name: 'Freight', unit: 'per_kg', category: F, appliesToMode: [ShipmentMode.AIR] },
    { name: 'Ocean Freight', unit: 'per_container', category: F, appliesToMode: [ShipmentMode.FCL] },
    { name: 'Ocean Freight (LCL)', unit: 'per_cbm', category: F, appliesToMode: [ShipmentMode.LCL] },
    { name: 'BAF', unit: 'flat', category: F, appliesToMode: SEA },
    { name: 'CAF', unit: 'flat', category: F, appliesToMode: SEA },
    { name: 'PSS', unit: 'flat', category: F, appliesToMode: SEA },
    { name: 'Fuel Surcharge', unit: 'flat', category: F, appliesToMode: [ShipmentMode.AIR, ShipmentMode.COURIER] },
    { name: 'Origin Pickup', unit: 'flat', category: O, appliesToMode: ALL_MODES },
    { name: 'Origin Haulage', unit: 'flat', category: O, appliesToMode: SEA },
    { name: 'Origin Handling', unit: 'flat', category: O, appliesToMode: [ShipmentMode.AIR, ...SEA] },
    { name: 'Origin THC', unit: 'flat', category: O, appliesToMode: SEA },
    { name: 'Export Customs Clearance', unit: 'flat', category: O, appliesToMode: ALL_MODES },
    { name: 'Airline Charges', unit: 'flat', category: D, appliesToMode: [ShipmentMode.AIR] },
    { name: 'Destination Handling', unit: 'flat', category: D, appliesToMode: [ShipmentMode.AIR, ...SEA] },
    { name: 'Destination THC', unit: 'flat', category: D, appliesToMode: SEA },
    { name: 'Transportation', unit: 'flat', category: D, appliesToMode: ALL_MODES },
    { name: 'Delivery Charges', unit: 'flat', category: D, appliesToMode: ALL_MODES },
    { name: 'THC', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'Documentation', unit: 'flat', category: L, appliesToMode: ALL_MODES },
    { name: 'BL Charges', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'CFS Charges', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'Port Charges', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'Seal Charges', unit: 'flat', category: L, appliesToMode: [ShipmentMode.FCL] },
    { name: 'VGM', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'ISPS', unit: 'flat', category: L, appliesToMode: SEA },
    { name: 'Customs Clearance', unit: 'flat', category: L, appliesToMode: ALL_MODES },
    { name: 'Container Detention', unit: 'flat', category: L, appliesToMode: [ShipmentMode.FCL] },
    { name: 'Demurrage', unit: 'flat', category: L, appliesToMode: [ShipmentMode.FCL] },
    { name: 'Insurance', unit: 'flat', category: OTH, appliesToMode: ALL_MODES },
    { name: 'Other Charges', unit: 'flat', category: OTH, appliesToMode: ALL_MODES },
  ];
  for (const c of chargeTypes) {
    const existing = await prisma.chargeType.findFirst({ where: { name: c.name } });
    if (existing) {
      await prisma.chargeType.update({
        where: { id: existing.id },
        data: { unit: c.unit, category: c.category, appliesToMode: c.appliesToMode },
      });
    } else {
      await prisma.chargeType.create({ data: c });
    }
  }

  // ─── Vendors (sample) ───
  const vendors = [
    { name: 'ABC Freight Forwarders', email: 'quotes@abcfreight.example', contactPerson: 'R. Sharma', modeCapabilities: [ShipmentMode.AIR, ShipmentMode.LCL, ShipmentMode.FCL] },
    { name: 'Global Cargo Movers', email: 'sales@globalcargo.example', contactPerson: 'M. Iyer', modeCapabilities: [ShipmentMode.AIR, ShipmentMode.COURIER] },
    { name: 'Oceanic Lines Pvt Ltd', email: 'ops@oceanic.example', contactPerson: 'S. Khan', modeCapabilities: [ShipmentMode.LCL, ShipmentMode.FCL] },
  ];
  const vendorByName: Record<string, string> = {};
  for (const v of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { name: v.name } });
    const row = existing ?? (await prisma.vendor.create({ data: v }));
    vendorByName[v.name] = row.id;
  }

  // ─── Vendor groups (BRD §Vendor Selection) ───
  const groups = [
    { name: 'Europe Air', members: ['ABC Freight Forwarders', 'Global Cargo Movers'] },
    { name: 'USA Air', members: ['Global Cargo Movers'] },
    { name: 'Europe FCL', members: ['ABC Freight Forwarders', 'Oceanic Lines Pvt Ltd'] },
    { name: 'Europe LCL', members: ['Oceanic Lines Pvt Ltd'] },
    { name: 'China Imports', members: ['ABC Freight Forwarders', 'Oceanic Lines Pvt Ltd'] },
  ];
  for (const g of groups) {
    let grp = await prisma.vendorGroup.findFirst({ where: { name: g.name } });
    if (!grp) grp = await prisma.vendorGroup.create({ data: { name: g.name } });
    for (const m of g.members) {
      const vendorId = vendorByName[m];
      if (!vendorId) continue;
      const exists = await prisma.vendorGroupMember.findFirst({
        where: { groupId: grp.id, vendorId },
      });
      if (!exists)
        await prisma.vendorGroupMember.create({ data: { groupId: grp.id, vendorId } });
    }
  }

  // ─── Parties (customers/consignees for export, suppliers/buyers for import) ───
  const parties: { name: string; roles: PartyRole[]; country?: string }[] = [
    { name: 'D’Decor Home Fabrics (HO)', roles: [PartyRole.BUYER], country: 'India' },
    { name: 'Maison Textiles GmbH', roles: [PartyRole.CUSTOMER, PartyRole.CONSIGNEE], country: 'Germany' },
    { name: 'Anderson Home Corp', roles: [PartyRole.CUSTOMER, PartyRole.CONSIGNEE], country: 'USA' },
    { name: 'Shanghai Weaving Co.', roles: [PartyRole.SUPPLIER], country: 'China' },
    { name: 'Emirates Yarn Trading', roles: [PartyRole.SUPPLIER], country: 'UAE' },
  ];
  for (const p of parties) {
    const existing = await prisma.party.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.party.create({ data: p });
  }

  // ─── Generic dropdown masters ───
  const lookups: { category: string; label: string; sortOrder?: number }[] = [
    ...['20GP', '40GP', '40HC', '45HC', 'Reefer', 'Open Top', 'Flat Rack'].map(
      (label, i) => ({ category: 'CONTAINER_TYPE', label, sortOrder: i }),
    ),
    ...['Cartons', 'Rolls', 'Pallets', 'Crates', 'Bundles', 'Bales', 'Drums'].map(
      (label, i) => ({ category: 'PACKAGE_TYPE', label, sortOrder: i }),
    ),
    ...['Commercial Shipment', 'Sample', 'Raw Material', 'Machinery', 'Spare Parts', 'Chemicals', 'Others'].map(
      (label, i) => ({ category: 'NATURE_OF_CARGO', label, sortOrder: i }),
    ),
    ...['Home Furnishings', 'Upholstery Fabric', 'Curtains', 'Yarn', 'Accessories', 'Machinery'].map(
      (label, i) => ({ category: 'COMMODITY', label, sortOrder: i }),
    ),
    ...['Airport to Airport', 'Door to Airport', 'Airport to Door', 'Door to Door', 'Port to Port', 'Door to Port', 'Port to Door'].map(
      (label, i) => ({ category: 'SERVICE_SCOPE', label, sortOrder: i }),
    ),
    ...['Home Textiles', 'Exports', 'Imports', 'Retail'].map((label, i) => ({
      category: 'BUSINESS_UNIT',
      label,
      sortOrder: i,
    })),
  ];
  for (const o of lookups) {
    const existing = await prisma.lookupOption.findFirst({
      where: { category: o.category, label: o.label },
    });
    if (!existing) await prisma.lookupOption.create({ data: o });
  }

  // ─── Incoterms (drives the dynamic incoterm section + responsibility matrix) ───
  const incoterms: {
    code: string;
    name: string;
    shownFields: string[];
    sortOrder: number;
  }[] = [
    { code: 'EXW', name: 'Ex Works', shownFields: ['Pickup Address', 'Pickup Required', 'Origin Haulage'], sortOrder: 1 },
    { code: 'FCA', name: 'Free Carrier', shownFields: ['Named Place', 'Export Customs Responsibility', 'Buyer’s Forwarder'], sortOrder: 2 },
    { code: 'FOB', name: 'Free On Board', shownFields: ['Port of Loading', 'Shipping Line Preference', 'Cargo Cut-off Date'], sortOrder: 3 },
    { code: 'CFR', name: 'Cost and Freight', shownFields: ['Ocean Freight Included'], sortOrder: 4 },
    { code: 'CIF', name: 'Cost, Insurance & Freight', shownFields: ['Insurance Value', 'Insurance Company', 'Freight Prepaid'], sortOrder: 5 },
    { code: 'CPT', name: 'Carriage Paid To', shownFields: ['Named Place', 'Carriage Paid'], sortOrder: 6 },
    { code: 'CIP', name: 'Carriage & Insurance Paid To', shownFields: ['Named Place', 'Insurance Value'], sortOrder: 7 },
    { code: 'DAP', name: 'Delivered At Place', shownFields: ['Delivery Address', 'Final Transport'], sortOrder: 8 },
    { code: 'DDP', name: 'Delivered Duty Paid', shownFields: ['Delivery Address', 'Customs Broker', 'Duty Responsibility', 'Last Mile Delivery'], sortOrder: 9 },
  ];
  for (const it of incoterms) {
    const existing = await prisma.incoterm.findUnique({ where: { code: it.code } });
    if (!existing)
      await prisma.incoterm.create({
        data: {
          code: it.code,
          name: it.name,
          shownFields: it.shownFields,
          sortOrder: it.sortOrder,
        },
      });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
