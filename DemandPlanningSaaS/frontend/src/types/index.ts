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
export type ModuleId = 'demand' | 'inventory' | 'diagnostics' | 'sop' | 'finance' | 'analytics';

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
