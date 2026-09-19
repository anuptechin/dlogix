import { EnquiryStatus, ShipmentMode, ShipmentDirection } from '@lprms/shared';

export const MODE_LABEL: Record<string, string> = {
  AIR: 'Air Freight',
  LCL: 'Sea LCL',
  FCL: 'Sea FCL',
  COURIER: 'Courier',
};

export const MODE_OPTIONS = [
  { label: 'Air Freight', value: ShipmentMode.AIR },
  { label: 'Sea LCL', value: ShipmentMode.LCL },
  { label: 'Sea FCL', value: ShipmentMode.FCL },
  { label: 'Courier', value: ShipmentMode.COURIER },
];

export const DIRECTION_OPTIONS = [
  { label: 'Export', value: ShipmentDirection.EXPORT },
  { label: 'Import', value: ShipmentDirection.IMPORT },
];

export const STATUS_COLOR: Record<string, string> = {
  [EnquiryStatus.DRAFT]: 'default',
  [EnquiryStatus.SENT]: 'blue',
  [EnquiryStatus.QUOTING]: 'gold',
  [EnquiryStatus.COMPARED]: 'purple',
  [EnquiryStatus.AWARDED]: 'green',
  [EnquiryStatus.CLOSED]: 'default',
  [EnquiryStatus.CANCELLED]: 'red',
};

export const EV_STATUS_COLOR: Record<string, string> = {
  INVITED: 'blue',
  OPENED: 'gold',
  RESPONDED: 'green',
  DECLINED: 'red',
};

export function num(v: string | number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
