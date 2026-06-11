// ─────────────────────────────────────────────────────────────────────────────
// Planora AI — Shared Platform Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'viewer' | 'planner' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  avatar?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

// ── Platform ──────────────────────────────────────────────────────────────────
export type ModuleId = 'demand' | 'inventory' | 'diagnostics' | 'sop' | 'finance' | 'analytics' | 'bi' | 'twin' | 'retail';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: string;
  tabs: TabDef[];
  minRole: UserRole;
}

export interface TabDef {
  id: string;
  label: string;
  minRole?: UserRole;
}

// ── SKU / Data ────────────────────────────────────────────────────────────────
export interface SKU {
  id: string;
  name: string;
  category: string;
  base: number;
  type: string;
  onHand: number;
  inTransit: number;
  unitCost: number;
  holdingCostPct: number;
  leadTime: number;
  leadTimeStdDev: number;
  supplyCapacity: number;
  aopVolume: number;
  asp: number;
  cv: number;
  adi: number;
  sysMape: number;
  humMape: number;
  overrideRate: number;
  history: HistoryPoint[];
}

export interface HistoryPoint {
  period: string;
  actual: number;
  isHistorical: boolean;
}

export interface ForecastPoint {
  period: string;
  actual: number | null;
  forecast: number | null;
  lowerBound?: number;
  upperBound?: number;
  consensusVolume?: number;
  isHistorical: boolean;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

// ── Permissions helper ────────────────────────────────────────────────────────
const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0, planner: 1, manager: 2, admin: 3,
};

export function hasPermission(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

// ── Currency definitions ──────────────────────────────────────────────────────
export interface Currency {
  code: string;
  symbol: string;
  label: string;
  rate: number;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar', rate: 1.0, locale: 'en-US' },
  { code: 'CAD', symbol: 'C$', label: 'CAN Dollar', rate: 1.37, locale: 'en-CA' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', rate: 157.0, locale: 'ja-JP' },
  { code: 'GBP', symbol: '£', label: 'Pound Sterling', rate: 0.78, locale: 'en-GB' },
  { code: 'EUR', symbol: '€', label: 'Euro', rate: 0.92, locale: 'de-DE' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan', rate: 7.25, locale: 'zh-CN' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', rate: 1.35, locale: 'en-SG' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', rate: 1.51, locale: 'en-AU' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupees', rate: 83.5, locale: 'en-IN' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', rate: 3.67, locale: 'ar-AE-u-nu-latn' },
];

export function formatCurrency(value: number, currencyCode: string, isAbbreviated = false): string {
  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const converted = value * cur.rate;
  let displayVal = converted;
  let suffix = '';
  
  if (isAbbreviated && Math.abs(converted) >= 1000) {
    displayVal = converted / 1000;
    suffix = 'k';
  }
  
  const isZeroDecimal = cur.code === 'JPY' || cur.code === 'CNY' || cur.code === 'INR';
  const maxDec = isAbbreviated ? 1 : (isZeroDecimal ? 0 : 2);
  const minDec = isAbbreviated ? 1 : (isZeroDecimal ? 0 : 0);

  return `${cur.symbol}${displayVal.toLocaleString(cur.locale, {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  })}${suffix}`;
}

// ── Network Topology & Scenarios ──────────────────────────────────────────────
export interface NetworkNode {
  id: string;
  label: string;
  type: 'supplier' | 'dc' | 'retail' | 'customer';
  status: 'normal' | 'warning' | 'critical';
  inventoryValue?: number;
  capacity?: number;
  location: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  leadTimeDays: number;
  status: 'normal' | 'delayed' | 'blocked';
  throughput?: number;
}

export interface ScenarioOverride {
  nodeId?: string;
  edgeId?: string;
  field: string;
  value: number | string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  overrides: ScenarioOverride[];
  isActive: boolean;
}

// ── Retail Planning & Category Management ────────────────────────────────────
export interface RetailCategory {
  id: string;
  name: string;
  department: string;
  revenue: number;
  margin: number;
  skus: number;
  growthPct: number;
}

export interface PlanogramSpace {
  categoryId: string;
  linearFeet: number;
  facings: number;
  spaceSharePct: number;
  salesSharePct: number;
}
