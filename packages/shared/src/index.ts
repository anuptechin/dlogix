// ─── Enums (mirror the PostgreSQL enums / Prisma schema) ───────────────

export const UserRole = {
  LOGISTICS: 'LOGISTICS',
  DOCUMENTATION: 'DOCUMENTATION',
  MANAGEMENT: 'MANAGEMENT',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ShipmentDirection = {
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
} as const;
export type ShipmentDirection =
  (typeof ShipmentDirection)[keyof typeof ShipmentDirection];

export const ShipmentMode = {
  AIR: 'AIR',
  LCL: 'LCL',
  FCL: 'FCL',
  COURIER: 'COURIER',
} as const;
export type ShipmentMode = (typeof ShipmentMode)[keyof typeof ShipmentMode];

export const EnquiryStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  QUOTING: 'QUOTING',
  COMPARED: 'COMPARED',
  AWARDED: 'AWARDED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type EnquiryStatus = (typeof EnquiryStatus)[keyof typeof EnquiryStatus];

export const QuoteStatus = {
  PENDING: 'PENDING',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const EnquiryVendorStatus = {
  INVITED: 'INVITED',
  OPENED: 'OPENED',
  RESPONDED: 'RESPONDED',
  DECLINED: 'DECLINED',
} as const;
export type EnquiryVendorStatus =
  (typeof EnquiryVendorStatus)[keyof typeof EnquiryVendorStatus];

export const FeedbackType = {
  WON: 'WON',
  LOST: 'LOST',
  GENERIC: 'GENERIC',
} as const;
export type FeedbackType = (typeof FeedbackType)[keyof typeof FeedbackType];

export const ChargeCategory = {
  FREIGHT: 'FREIGHT',
  ORIGIN: 'ORIGIN',
  DESTINATION: 'DESTINATION',
  LOCAL: 'LOCAL',
  OTHER: 'OTHER',
} as const;
export type ChargeCategory =
  (typeof ChargeCategory)[keyof typeof ChargeCategory];

export const ShipmentPriority = {
  NORMAL: 'NORMAL',
  URGENT: 'URGENT',
} as const;
export type ShipmentPriority =
  (typeof ShipmentPriority)[keyof typeof ShipmentPriority];

export const RateType = {
  SPOT: 'SPOT',
  CONTRACT: 'CONTRACT',
} as const;
export type RateType = (typeof RateType)[keyof typeof RateType];

export const PartyRole = {
  CUSTOMER: 'CUSTOMER',
  CONSIGNEE: 'CONSIGNEE',
  SUPPLIER: 'SUPPLIER',
  BUYER: 'BUYER',
} as const;
export type PartyRole = (typeof PartyRole)[keyof typeof PartyRole];

// ─── DTO / API contract shapes ─────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export interface CreateEnquiryInput {
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
  targetDate?: string; // ISO date
  quoteDeadline?: string; // ISO datetime

  // BRD: parties
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

  // BRD: cargo
  commodity?: string;
  hsCode?: string;
  natureOfCargo?: string;
  packageType?: string;
  packageCount?: number;
  netWeightKg?: number;
  cargoValue?: number;
  cargoCurrency?: string;
  priority?: ShipmentPriority;

  // BRD: origin/destination detail
  pickupAddress?: string;
  deliveryAddress?: string;
  finalDestination?: string;
  stuffingLocation?: string;
  factoryStuffing?: boolean;

  // BRD: service scope + checkbox flags
  serviceScope?: string;
  serviceOptions?: Record<string, boolean>;

  // BRD: shipping requirements
  preferredShippingLine?: string;
  preferredVessel?: string;
  directServiceOnly?: boolean;
  transshipmentAllowed?: boolean;
  maxTransitDays?: number;
  etdRequired?: string;
  etaRequired?: string;

  // BRD: quote submission
  quoteValidityDate?: string;
  sailingRequiredBefore?: string;

  // BRD: incoterm-specific + remarks
  incotermDetails?: Record<string, unknown>;
  specialInstructions?: string;
  internalRemarks?: string;

  // BRD: children
  dimensions?: DimensionInput[];
  containers?: ContainerInput[];
  requiredChargeTypeIds?: string[];
}

export interface QuotationLineInput {
  chargeTypeId?: string;
  description?: string;
  unit?: string;
  qty: number;
  rate: number;
}

export interface SaveQuotationInput {
  currency: string;
  validUntil?: string;
  transitTimeDays?: number;
  remarks?: string;
  lines: QuotationLineInput[];

  // BRD "features wished for"
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

export interface AwardInput {
  quotationId: string;
  reason?: string;
}

// Comparison-screen response (see Phase 1 plan §4)
export interface ComparisonVendorRow {
  vendorId: string;
  name: string;
  status: QuoteStatus;
  currency: string;
  transitTimeDays?: number;
  validUntil?: string;
  lines: Record<string, number>; // chargeTypeId -> amount
  total: number;
  // BRD: landed-cost breakdown + sailing/free-days
  categoryTotals?: Partial<Record<ChargeCategory, number>>;
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

export interface ComparisonHistoryRow {
  vendor: string;
  amount: number;
  awardedAt: string;
}

export interface ComparisonResponse {
  enquiry: {
    id: string;
    enquiryNo: string;
    mode: ShipmentMode;
    direction: ShipmentDirection;
    chargeableWeight?: number;
  };
  chargeTypes: { id: string; name: string; category?: ChargeCategory }[];
  vendors: ComparisonVendorRow[];
  history: ComparisonHistoryRow[];
}
