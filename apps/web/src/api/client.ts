import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3093';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export interface HealthResponse {
  status: string;
  service: string;
  db: string;
  time: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
}

// ─── Auth ───────────────────────────────────────────────────
export type Role = 'ADMIN' | 'MANAGEMENT' | 'LOGISTICS' | 'DOCUMENTATION';
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export async function requestOtp(email: string): Promise<void> {
  await api.post('/auth/request-otp', { email });
}
export async function verifyOtp(email: string, code: string): Promise<SessionUser> {
  const { data } = await api.post<SessionUser>('/auth/verify-otp', { email, code });
  return data;
}
export async function login(email: string, password: string): Promise<SessionUser> {
  const { data } = await api.post<SessionUser>('/auth/login', { email, password });
  return data;
}
export async function logout(): Promise<void> {
  await api.post('/auth/logout', {});
}
export async function getMe(): Promise<SessionUser> {
  const { data } = await api.get<SessionUser>('/auth/me');
  return data;
}

// ─── Users (admin) ──────────────────────────────────────────
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}
export async function listUsers(): Promise<ManagedUser[]> {
  const { data } = await api.get<ManagedUser[]>('/users');
  return data;
}
export async function createUser(input: {
  name: string;
  email: string;
  role: Role;
  password: string;
}): Promise<ManagedUser> {
  const { data } = await api.post<ManagedUser>('/users', input);
  return data;
}
export async function updateUser(
  id: string,
  input: { name?: string; role?: Role; isActive?: boolean; password?: string },
): Promise<ManagedUser> {
  const { data } = await api.patch<ManagedUser>(`/users/${id}`, input);
  return data;
}

// ─── Vendors ────────────────────────────────────────────────
import type { ShipmentMode } from '@lprms/shared';

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  modeCapabilities: ShipmentMode[];
  isActive: boolean;
  createdAt: string;
}

export interface VendorInput {
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  modeCapabilities?: ShipmentMode[];
  isActive?: boolean;
}

export async function listVendors(params?: {
  q?: string;
  active?: boolean;
}): Promise<Vendor[]> {
  const { data } = await api.get<Vendor[]>('/vendors', { params });
  return data;
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  const { data } = await api.post<Vendor>('/vendors', input);
  return data;
}

export async function updateVendor(
  id: string,
  input: Partial<VendorInput>,
): Promise<Vendor> {
  const { data } = await api.patch<Vendor>(`/vendors/${id}`, input);
  return data;
}

// ─── Lookups ────────────────────────────────────────────────
export interface PortLocation {
  id: string;
  kind: string;
  code?: string | null;
  name: string;
  country?: string | null;
}

export interface ChargeType {
  id: string;
  name: string;
  unit?: string | null;
  category?: ChargeCategory;
  appliesToMode: ShipmentMode[];
  isActive: boolean;
}

export async function listLocations(): Promise<PortLocation[]> {
  const { data } = await api.get<PortLocation[]>('/locations');
  return data;
}

export async function listChargeTypes(mode?: ShipmentMode): Promise<ChargeType[]> {
  const { data } = await api.get<ChargeType[]>('/charge-types', {
    params: mode ? { mode } : undefined,
  });
  return data;
}

// ─── BRD masters (parties, vendor groups, lookups, incoterms) ──
export interface Party {
  id: string;
  name: string;
  code?: string | null;
  roles: PartyRole[];
  country?: string | null;
  isActive: boolean;
}
export interface VendorGroupItem {
  id: string;
  name: string;
  description?: string | null;
  vendorIds: string[];
}
export interface LookupOption {
  id: string;
  category: string;
  code?: string | null;
  label: string;
  sortOrder: number;
}
export interface IncotermItem {
  id: string;
  code: string;
  name: string;
  shownFields?: string[] | null;
  sortOrder: number;
}

export async function listParties(role?: PartyRole): Promise<Party[]> {
  const { data } = await api.get<Party[]>('/masters/parties', {
    params: role ? { role } : undefined,
  });
  return data;
}
export async function listVendorGroups(): Promise<VendorGroupItem[]> {
  const { data } = await api.get<VendorGroupItem[]>('/masters/vendor-groups');
  return data;
}
export async function listLookups(category?: string): Promise<LookupOption[]> {
  const { data } = await api.get<LookupOption[]>('/masters/lookups', {
    params: category ? { category } : undefined,
  });
  return data;
}
export async function listIncoterms(): Promise<IncotermItem[]> {
  const { data } = await api.get<IncotermItem[]>('/masters/incoterms');
  return data;
}

// ─── Enquiries ──────────────────────────────────────────────
import type {
  ShipmentDirection,
  EnquiryStatus,
  EnquiryVendorStatus,
  QuoteStatus,
  ChargeCategory,
  PartyRole,
  RateType,
  ShipmentPriority,
} from '@lprms/shared';

// Prisma Decimal fields serialize to strings over JSON.
type Decimalish = string | number | null;

export interface EnquiryListItem {
  id: string;
  enquiryNo: string;
  direction: ShipmentDirection;
  mode: ShipmentMode;
  status: EnquiryStatus;
  cargoDesc?: string | null;
  weightKg?: Decimalish;
  chargeableWeight?: Decimalish;
  targetDate?: string | null;
  quoteDeadline?: string | null;
  createdAt: string;
  origin?: PortLocation | null;
  destination?: PortLocation | null;
  _count: { enquiryVendors: number };
}

export interface EnquiryVendorRow {
  id: string;
  vendorId: string;
  status: EnquiryVendorStatus;
  invitedAt: string;
  respondedAt?: string | null;
  tokenExpiresAt: string;
  vendor: Vendor;
  quotation?: { id: string; status: QuoteStatus; totalAmount: Decimalish } | null;
}

export interface EnquiryDimensionRow {
  id: string;
  label?: string | null;
  lengthCm: Decimalish;
  widthCm: Decimalish;
  heightCm: Decimalish;
  qty: number;
}
export interface EnquiryContainerRow {
  id: string;
  containerType: string;
  qty: number;
  estWeightKg?: Decimalish;
}
export interface EnquiryRequiredChargeRow {
  id: string;
  chargeTypeId: string;
  chargeType: ChargeType;
}
export interface EnquiryDocumentRow {
  id: string;
  docType?: string | null;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt: string;
}

export interface EnquiryDetail {
  id: string;
  enquiryNo: string;
  direction: ShipmentDirection;
  mode: ShipmentMode;
  originId?: string | null;
  destinationId?: string | null;
  originIcdCfsId?: string | null;
  cargoDesc?: string | null;
  weightKg?: Decimalish;
  volumeCbm?: Decimalish;
  chargeableWeight?: Decimalish;
  volumetricWeight?: Decimalish;
  netWeightKg?: Decimalish;
  incoterm?: string | null;
  targetDate?: string | null;
  quoteDeadline?: string | null;
  status: EnquiryStatus;
  createdAt: string;

  businessUnit?: string | null;
  branchPlant?: string | null;
  customerId?: string | null;
  consigneeId?: string | null;
  supplierId?: string | null;
  buyerId?: string | null;
  salesOrderNo?: string | null;
  customerPoNo?: string | null;
  supplierInvoiceNo?: string | null;
  poNumbers?: string[];
  commodity?: string | null;
  hsCode?: string | null;
  natureOfCargo?: string | null;
  packageType?: string | null;
  packageCount?: number | null;
  cargoValue?: Decimalish;
  cargoCurrency?: string | null;
  priority?: ShipmentPriority | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  finalDestination?: string | null;
  stuffingLocation?: string | null;
  factoryStuffing?: boolean | null;
  serviceScope?: string | null;
  serviceOptions?: Record<string, boolean> | null;
  preferredShippingLine?: string | null;
  preferredVessel?: string | null;
  directServiceOnly?: boolean | null;
  transshipmentAllowed?: boolean | null;
  maxTransitDays?: number | null;
  etdRequired?: string | null;
  etaRequired?: string | null;
  quoteValidityDate?: string | null;
  sailingRequiredBefore?: string | null;
  incotermDetails?: Record<string, unknown> | null;
  specialInstructions?: string | null;
  internalRemarks?: string | null;

  origin?: PortLocation | null;
  destination?: PortLocation | null;
  originIcdCfs?: PortLocation | null;
  customer?: Party | null;
  consignee?: Party | null;
  supplier?: Party | null;
  buyer?: Party | null;
  dimensions?: EnquiryDimensionRow[];
  containers?: EnquiryContainerRow[];
  requiredCharges?: EnquiryRequiredChargeRow[];
  documents?: EnquiryDocumentRow[];
  createdBy?: { id: string; name: string; email: string } | null;
  enquiryVendors: EnquiryVendorRow[];
  award?: unknown;
}

export interface DimensionInput {
  label?: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  qty: number;
}
export interface ContainerInput {
  containerType: string;
  qty: number;
  estWeightKg?: number;
}

export interface EnquiryInput {
  direction: ShipmentDirection;
  mode: ShipmentMode;
  originId?: string;
  destinationId?: string;
  originIcdCfsId?: string;
  cargoDesc?: string;
  weightKg?: number;
  volumeCbm?: number;
  chargeableWeight?: number;
  incoterm?: string;
  targetDate?: string;
  quoteDeadline?: string;

  // parties
  businessUnit?: string;
  branchPlant?: string;
  customerId?: string;
  consigneeId?: string;
  supplierId?: string;
  buyerId?: string;
  salesOrderNo?: string;
  customerPoNo?: string;
  supplierInvoiceNo?: string;
  poNumbers?: string[];

  // cargo
  commodity?: string;
  hsCode?: string;
  natureOfCargo?: string;
  packageType?: string;
  packageCount?: number;
  netWeightKg?: number;
  cargoValue?: number;
  cargoCurrency?: string;
  priority?: ShipmentPriority;

  // origin/destination detail
  pickupAddress?: string;
  deliveryAddress?: string;
  finalDestination?: string;
  stuffingLocation?: string;
  factoryStuffing?: boolean;

  // service scope + flags
  serviceScope?: string;
  serviceOptions?: Record<string, boolean>;

  // shipping requirements
  preferredShippingLine?: string;
  preferredVessel?: string;
  directServiceOnly?: boolean;
  transshipmentAllowed?: boolean;
  maxTransitDays?: number;
  etdRequired?: string;
  etaRequired?: string;

  // quote submission
  quoteValidityDate?: string;
  sailingRequiredBefore?: string;

  // incoterm + remarks
  incotermDetails?: Record<string, unknown>;
  specialInstructions?: string;
  internalRemarks?: string;

  // children
  dimensions?: DimensionInput[];
  containers?: ContainerInput[];
  requiredChargeTypeIds?: string[];
}

export async function listEnquiries(params?: {
  status?: EnquiryStatus;
  mode?: ShipmentMode;
  direction?: ShipmentDirection;
}): Promise<EnquiryListItem[]> {
  const { data } = await api.get<EnquiryListItem[]>('/enquiries', { params });
  return data;
}

export async function getEnquiry(id: string): Promise<EnquiryDetail> {
  const { data } = await api.get<EnquiryDetail>(`/enquiries/${id}`);
  return data;
}

export async function createEnquiry(input: EnquiryInput): Promise<EnquiryDetail> {
  const { data } = await api.post<EnquiryDetail>('/enquiries', input);
  return data;
}

export async function updateEnquiry(
  id: string,
  input: Partial<EnquiryInput>,
): Promise<EnquiryDetail> {
  const { data } = await api.patch<EnquiryDetail>(`/enquiries/${id}`, input);
  return data;
}

export async function addEnquiryVendors(
  id: string,
  vendorIds: string[],
): Promise<EnquiryDetail> {
  const { data } = await api.post<EnquiryDetail>(`/enquiries/${id}/vendors`, {
    vendorIds,
  });
  return data;
}

export async function removeEnquiryVendor(
  id: string,
  enquiryVendorId: string,
): Promise<EnquiryDetail> {
  const { data } = await api.delete<EnquiryDetail>(
    `/enquiries/${id}/vendors/${enquiryVendorId}`,
  );
  return data;
}

export async function sendEnquiry(id: string): Promise<EnquiryDetail> {
  const { data } = await api.post<EnquiryDetail>(`/enquiries/${id}/send`);
  return data;
}

// ─── Smart Decision Panel (insights) ───────────────────────
export interface EnquiryInsights {
  lane: {
    direction: ShipmentDirection;
    mode: ShipmentMode;
    origin?: { code?: string | null; name: string } | null;
    destination?: { code?: string | null; name: string } | null;
  };
  previousShipment: {
    vendor: string;
    amount: number | null;
    currency: string;
    awardedAt: string | null;
  } | null;
  historicalRates: {
    count: number;
    avg: number;
    low: number;
    high: number;
    currency: string;
  } | null;
  vendorPerformance: {
    vendorId: string;
    name: string;
    invited: number;
    quoted: number;
    won: number;
    winRate: number;
    responseRate: number;
  }[];
  suggestedVendors: {
    vendorId: string;
    name: string;
    email: string;
    laneWins: number;
    winRate: number;
    responseRate: number;
  }[];
  duplicates: {
    id: string;
    enquiryNo: string;
    status: EnquiryStatus;
    createdAt: string;
    targetDate?: string | null;
  }[];
  incoterm: { code: string; name: string; shownFields?: string[] | null } | null;
}

export async function getEnquiryInsights(id: string): Promise<EnquiryInsights> {
  const { data } = await api.get<EnquiryInsights>(`/enquiries/${id}/insights`);
  return data;
}

// ─── Documents ─────────────────────────────────────────────
export async function uploadEnquiryDocument(
  id: string,
  file: File,
  docType?: string,
): Promise<EnquiryDetail> {
  const fd = new FormData();
  fd.append('file', file);
  if (docType) fd.append('docType', docType);
  const { data } = await api.post<EnquiryDetail>(`/enquiries/${id}/documents`, fd);
  return data;
}

export function enquiryDocumentUrl(id: string, docId: string): string {
  return `${baseURL}/enquiries/${id}/documents/${docId}/download`;
}

export async function removeEnquiryDocument(
  id: string,
  docId: string,
): Promise<EnquiryDetail> {
  const { data } = await api.delete<EnquiryDetail>(
    `/enquiries/${id}/documents/${docId}`,
  );
  return data;
}

// ─── Comparison ─────────────────────────────────────────────
export interface ComparisonColumn {
  id: string;
  name: string;
  category?: ChargeCategory;
}

export interface ComparisonVendor {
  vendorId: string;
  enquiryVendorId: string;
  name: string;
  submitted: boolean;
  status: QuoteStatus;
  currency: string;
  transitTimeDays?: number | null;
  validUntil?: string | null;
  quotationId?: string | null;
  lines: Record<string, number>;
  total: number | null;
  categoryTotals?: Partial<Record<ChargeCategory, number>>;
  rateType?: RateType | null;
  freeDetentionOriginDays?: number | null;
  freeDetentionDestDays?: number | null;
  freeDemurrageDestDays?: number | null;
  etd?: string | null;
  eta?: string | null;
  transshipments?: number | null;
  shippingLine?: string | null;
  vesselName?: string | null;
}

export interface ComparisonHistoryRow {
  vendor: string;
  amount: number | null;
  currency?: string | null;
  awardedAt: string;
}

export interface Comparison {
  enquiry: {
    id: string;
    enquiryNo: string;
    direction: ShipmentDirection;
    mode: ShipmentMode;
    status: EnquiryStatus;
    chargeableWeight?: number | null;
    quoteDeadline?: string | null;
    origin?: { code?: string | null; name: string } | null;
    destination?: { code?: string | null; name: string } | null;
    awardedQuotationId?: string | null;
  };
  chargeTypes: ComparisonColumn[];
  vendors: ComparisonVendor[];
  history: ComparisonHistoryRow[];
}

export async function getComparison(id: string): Promise<Comparison> {
  const { data } = await api.get<Comparison>(`/enquiries/${id}/comparison`);
  return data;
}

export async function awardEnquiry(
  id: string,
  quotationId: string,
  reason?: string,
): Promise<EnquiryDetail> {
  const { data } = await api.post<EnquiryDetail>(`/enquiries/${id}/award`, {
    quotationId,
    reason,
  });
  return data;
}

// ─── Dashboard & audit ─────────────────────────────────────
export interface DashboardData {
  kpis: {
    totalEnquiries: number;
    awarded: number;
    awardedValue: number;
    activeVendors: number;
    activeContracts: number;
    responseRate: number;
  };
  byStatus: Record<string, number>;
  spendByMode: { mode: string; amount: number; count: number }[];
  vendorPerformance: {
    vendorId: string;
    name: string;
    invited: number;
    quoted: number;
    won: number;
    awardedValue: number;
    winRate: number;
  }[];
  recentAwards: {
    enquiryNo: string;
    vendor: string;
    mode: string;
    route: string;
    amount: number;
    currency: string;
    awardedAt: string;
  }[];
  expiringContracts: {
    id: string;
    serviceName: string;
    vendor: string;
    validTo: string | null;
    daysLeft: number | null;
  }[];
}

export interface AuditRow {
  id: string;
  actor: string;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  at: string;
}

export interface AuditFacets {
  entities: string[];
  actions: string[];
  actors: { id: string; name: string }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}

export async function listAudit(params?: {
  entity?: string;
  action?: string;
  actorId?: string;
  q?: string;
  limit?: number;
}): Promise<AuditRow[]> {
  const { data } = await api.get<AuditRow[]>('/audit', { params });
  return data;
}

export async function getAuditFacets(): Promise<AuditFacets> {
  const { data } = await api.get<AuditFacets>('/audit/facets');
  return data;
}

export async function logLoginEvent(): Promise<void> {
  await api.post('/audit/login-event', {});
}

// ─── Courier rate cards & calculator ───────────────────────
export type CourierSurchargeType = 'FUEL_PCT' | 'REMOTE_AREA' | 'OTHER';

export interface CourierContractListItem {
  id: string;
  serviceName: string;
  direction: ShipmentDirection;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  createdAt: string;
  vendor: { id: string; name: string };
  _count: { slabs: number; transits: number };
}

export interface CourierSlab {
  id?: string;
  destinationZone: string;
  weightFromKg: Decimalish;
  weightToKg: Decimalish;
  ratePerKg?: Decimalish;
  flatRate?: Decimalish;
  minCharge?: Decimalish;
}
export interface CourierSurcharge {
  id?: string;
  type: CourierSurchargeType;
  label: string;
  value: Decimalish;
  isPercentage: boolean;
}
export interface CourierTransit {
  id?: string;
  destinationZone: string;
  transitDays: number;
}
export interface CourierContract {
  id: string;
  vendorId: string;
  serviceName: string;
  direction: ShipmentDirection;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  notes?: string | null;
  vendor: { id: string; name: string };
  slabs: CourierSlab[];
  surcharges: CourierSurcharge[];
  transits: CourierTransit[];
}

export interface SaveContractInput {
  vendorId: string;
  serviceName: string;
  direction: ShipmentDirection;
  currency?: string;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  notes?: string;
  slabs: Omit<CourierSlab, 'id'>[];
  surcharges: Omit<CourierSurcharge, 'id'>[];
  transits: Omit<CourierTransit, 'id'>[];
}

export interface CalcResult {
  contract: { id: string; serviceName: string; vendor: string; currency: string };
  destinationZone: string;
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  currency: string;
  base: number;
  surcharges: { label: string; type: CourierSurchargeType; amount: number }[];
  total: number;
  transitDays: number | null;
  slabMatched: boolean;
}

export async function listCourierContracts(
  activeOnly = false,
): Promise<CourierContractListItem[]> {
  const { data } = await api.get<CourierContractListItem[]>(
    '/courier/contracts',
    { params: activeOnly ? { active: true } : undefined },
  );
  return data;
}

export async function getCourierContract(id: string): Promise<CourierContract> {
  const { data } = await api.get<CourierContract>(`/courier/contracts/${id}`);
  return data;
}

export async function createCourierContract(
  input: SaveContractInput,
): Promise<CourierContract> {
  const { data } = await api.post<CourierContract>('/courier/contracts', input);
  return data;
}

export async function updateCourierContract(
  id: string,
  input: SaveContractInput,
): Promise<CourierContract> {
  const { data } = await api.patch<CourierContract>(
    `/courier/contracts/${id}`,
    input,
  );
  return data;
}

export async function deleteCourierContract(id: string): Promise<void> {
  await api.delete(`/courier/contracts/${id}`);
}

export async function courierZones(id: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/courier/contracts/${id}/zones`);
  return data;
}

export async function calculateCourier(input: {
  contractId: string;
  destinationZone: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}): Promise<CalcResult> {
  const { data } = await api.post<CalcResult>('/courier/calculate', input);
  return data;
}

// ─── Export courier rate cards (DHL / FedEx) ───────────────
export type CourierCarrier = 'DHL' | 'FEDEX';
export type CourierFuelOrder = 'SURCHARGE_THEN_FUEL' | 'FUEL_THEN_SURCHARGE';

export interface RateCard {
  carrier: CourierCarrier;
  currency: string;
  fuelOrder: CourierFuelOrder;
  volumetricDivisorCm: number;
  volumetricDivisorIn: number;
  flatMaxWeightKg: number;
  surchargePerKg: number;
  fuelPct: number;
  gstPct: number;
  marginX: number;
  usdRate: number;
  gbpRate: number;
  eurRate: number;
  updatedAt: string;
  countries: number;
  rateRows: number;
}

export interface RateCardCountry {
  country: string;
  zone: string;
}

export interface ExportCalcResult {
  carrier: CourierCarrier;
  country: string;
  zone: string;
  unit: 'cm' | 'in';
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  billedWeightKg: number;
  regime: 'FLAT' | 'PERKG';
  matchedWeightKg: number;
  currency: string;
  breakdown: {
    base: number;
    ratePerKg: number;
    surchargePerKg: number;
    fuelPct: number;
    fuelOrder: CourierFuelOrder;
    fuelPerKg: number;
    subtotalPerKg: number;
    costToUs: number;
    marginX: number;
    sellingInr: number;
    gstPct: number;
    gstAmount: number;
    grandTotalInr: number;
  };
  selling: { inr: number; usd: number; gbp: number; eur: number };
  grandTotal: { inr: number; usd: number; gbp: number; eur: number };
}

export async function listRateCards(): Promise<RateCard[]> {
  const { data } = await api.get<RateCard[]>('/courier/rate-cards');
  return data;
}

export async function importRateCards(
  file: File,
): Promise<{ imported: { carrier: string; zones: number; rateRows: number; countries: number }[] }> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/courier/rate-cards/import', fd);
  return data;
}

export async function updateRateCard(
  carrier: CourierCarrier,
  input: Partial<Omit<RateCard, 'carrier' | 'currency' | 'updatedAt' | 'countries' | 'rateRows'>>,
): Promise<RateCard> {
  const { data } = await api.patch<RateCard>(`/courier/rate-cards/${carrier}`, input);
  return data;
}

export async function listRateCardCountries(
  carrier: CourierCarrier,
): Promise<RateCardCountry[]> {
  const { data } = await api.get<RateCardCountry[]>(
    `/courier/rate-cards/${carrier}/countries`,
  );
  return data;
}

export async function exportCalculate(input: {
  carrier: CourierCarrier;
  country: string;
  unit: 'cm' | 'in';
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  actualWeightKg?: number;
}): Promise<ExportCalcResult> {
  const { data } = await api.post<ExportCalcResult>('/courier/export-calculate', input);
  return data;
}

// ─── Vendor quotation portal (public token) ─────────────────
export interface QuotePlace {
  code?: string | null;
  name: string;
  country?: string | null;
}

export interface QuoteLine {
  id?: string;
  chargeTypeId?: string | null;
  description?: string | null;
  unit?: string | null;
  qty: Decimalish;
  rate: Decimalish;
  amount: Decimalish;
}

export interface QuotePortalQuotation {
  id: string;
  currency: string;
  validUntil?: string | null;
  transitTimeDays?: number | null;
  remarks?: string | null;
  status: QuoteStatus;
  submittedAt?: string | null;
  totalAmount: Decimalish;
  rateType?: RateType | null;
  freeDetentionOriginDays?: number | null;
  freeDetentionDestDays?: number | null;
  freeDemurrageDestDays?: number | null;
  etd?: string | null;
  eta?: string | null;
  transshipments?: number | null;
  shippingLine?: string | null;
  vesselName?: string | null;
  lines: QuoteLine[];
}

export interface QuotePortalSummary {
  expired: boolean;
  vendor: { name: string; contactPerson?: string | null };
  enquiry: {
    enquiryNo: string;
    direction: ShipmentDirection;
    mode: ShipmentMode;
    incoterm?: string | null;
    cargoDesc?: string | null;
    commodity?: string | null;
    packageType?: string | null;
    packageCount?: number | null;
    weightKg?: Decimalish;
    volumeCbm?: Decimalish;
    chargeableWeight?: Decimalish;
    serviceScope?: string | null;
    specialInstructions?: string | null;
    quoteDeadline?: string | null;
    quoteValidityDate?: string | null;
    sailingRequiredBefore?: string | null;
    tokenExpiresAt: string;
    origin?: QuotePlace | null;
    destination?: QuotePlace | null;
  };
  chargeTypes: {
    id: string;
    name: string;
    unit?: string | null;
    category?: ChargeCategory;
  }[];
  quotation: QuotePortalQuotation;
}

export interface SaveQuotationInput {
  currency?: string;
  validUntil?: string;
  transitTimeDays?: number;
  remarks?: string;
  lines: {
    chargeTypeId?: string;
    description?: string;
    unit?: string;
    qty: number;
    rate: number;
  }[];
  rateType?: RateType;
  freeDetentionOriginDays?: number;
  freeDetentionDestDays?: number;
  freeDemurrageDestDays?: number;
  etd?: string;
  eta?: string;
  transshipments?: number;
  shippingLine?: string;
  vesselName?: string;
}

export async function getQuoteSummary(token: string): Promise<QuotePortalSummary> {
  const { data } = await api.get<QuotePortalSummary>(`/portal/${token}`);
  return data;
}

export async function saveQuotation(
  token: string,
  input: SaveQuotationInput,
): Promise<QuotePortalQuotation> {
  const { data } = await api.put<QuotePortalQuotation>(
    `/portal/${token}/quotation`,
    input,
  );
  return data;
}

export async function submitQuotation(token: string): Promise<QuotePortalSummary> {
  const { data } = await api.post<QuotePortalSummary>(`/portal/${token}/submit`);
  return data;
}
