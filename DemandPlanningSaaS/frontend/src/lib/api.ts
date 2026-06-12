// ─────────────────────────────────────────────────────────────────────────────
// Planora AI — API Client Utilities
// ─────────────────────────────────────────────────────────────────────────────

import type { ForecastPoint } from '@/types';

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface RecordPage {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  items: Array<{
    id: number;
    date: string;
    sku: string;
    category: string;
    location: string;
    channel: string;
    target_demand: number;
    dataset_version: string;
  }>;
}

export interface DatasetSummary {
  dataset_version: string;
  total_records: number;
  sku_count: number;
  category_count: number;
  location_count: number;
  channel_count: number;
  total_demand: number;
  date_range: { min: string; max: string };
  categories: string[];
}

export async function checkHealth(): Promise<void> {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/`);
  if (!res.ok) throw new Error('Backend health check failed');
}

export async function uploadDataset(file: File): Promise<{ dataset_version: string; filename: string; status: string; records_processed: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to upload dataset');
  }

  return res.json();
}

export async function generateForecast(params: { dataset_version: string; sku: string; horizon: number }): Promise<any> {
  const { dataset_version, sku, horizon } = params;
  const url = `${NEXT_PUBLIC_API_URL}/api/forecast?dataset_version=${encodeURIComponent(dataset_version)}&sku=${encodeURIComponent(sku)}&horizon=${horizon}`;
  
  const res = await fetch(url, {
    method: 'POST',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to generate forecast');
  }

  return res.json();
}

export async function listRecords(params: {
  dataset_version: string;
  page: number;
  page_size: number;
  sort_by?: string;
  sort_dir?: string;
}): Promise<RecordPage> {
  const { dataset_version, page, page_size, sort_by = 'date', sort_dir = 'asc' } = params;
  const url = `${NEXT_PUBLIC_API_URL}/api/records?dataset_version=${encodeURIComponent(dataset_version)}&page=${page}&page_size=${page_size}&sort_by=${sort_by}&sort_dir=${sort_dir}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to retrieve records');
  }

  return res.json();
}

export async function getDatasetSummary(version: string): Promise<DatasetSummary> {
  const url = `${NEXT_PUBLIC_API_URL}/api/datasets/${encodeURIComponent(version)}/summary`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to retrieve dataset summary');
  }
  return res.json();
}

export function buildExportUrl(version: string, sku?: string, category?: string): string {
  let url = `${NEXT_PUBLIC_API_URL}/api/export/records?dataset_version=${encodeURIComponent(version)}`;
  if (sku) url += `&sku=${encodeURIComponent(sku)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return url;
}

export async function logAudit(
  userId: string,
  role: string,
  actionType: string,
  dataset: string = '',
  metadata: Record<string, any> = {}
): Promise<any> {
  const url = `${NEXT_PUBLIC_API_URL}/api/audit/log?user_id=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}&action_type=${encodeURIComponent(actionType)}&dataset=${encodeURIComponent(dataset)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error('Failed to log audit action');
  }

  return res.json();
}

export function buildChartData(
  result: { historical: Array<{ date: string; demand: number }>; forecast: Record<string, number[]> },
  modelKey: string,
  consensusAdjustments: Record<string, number>
): ForecastPoint[] {
  const chartData: ForecastPoint[] = [];

  // 1. Add historical points
  if (result.historical && result.historical.length > 0) {
    result.historical.forEach((item) => {
      chartData.push({
        period: item.date,
        actual: item.demand,
        forecast: null,
        consensusVolume: item.demand,
        isHistorical: true,
      });
    });
  }

  // 2. Add future forecast points
  const forecastArray = result.forecast[modelKey];
  if (forecastArray && forecastArray.length > 0) {
    const horizon = forecastArray.length;
    const lastDateStr = result.historical?.[result.historical.length - 1]?.date || '';
    
    const futurePeriods: string[] = [];
    if (lastDateStr.startsWith('Day')) {
      // Relative Day scenario
      const lastDayNum = parseInt(lastDateStr.replace('Day ', '')) || 0;
      for (let i = 0; i < horizon; i++) {
        const sign = lastDayNum + i + 1 >= 0 ? '+' : '';
        futurePeriods.push(`Day ${sign}${lastDayNum + i + 1}`);
      }
    } else {
      // Calendar Date scenario
      let lastDate = new Date(lastDateStr);
      if (isNaN(lastDate.getTime())) {
        lastDate = new Date();
      }
      
      let isMonthly = true;
      if (result.historical && result.historical.length >= 2) {
        const d1 = new Date(result.historical[result.historical.length - 2].date);
        const d2 = new Date(result.historical[result.historical.length - 1].date);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const diffDays = Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 15) {
            isMonthly = false; // daily or weekly
          }
        }
      }

      for (let i = 0; i < horizon; i++) {
        let nextDate: Date;
        if (isMonthly) {
          nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1 + i, 1);
        } else {
          nextDate = new Date(lastDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        }
        futurePeriods.push(nextDate.toISOString().split('T')[0]);
      }
    }

    forecastArray.forEach((val, i) => {
      const period = futurePeriods[i];
      const adj = consensusAdjustments[period] || 0;
      const forecastVal = Math.round(val);
      const consensusVal = Math.round(val * (1 + adj / 100));

      chartData.push({
        period,
        actual: null,
        forecast: forecastVal,
        lowerBound: Math.round(forecastVal * 0.9),
        upperBound: Math.round(forecastVal * 1.1),
        consensusVolume: consensusVal,
        isHistorical: false,
      });
    });
  }

  return chartData;
}

// ═════════════════════════════════════════════════════════════════════════════
// Demand Sensing APIs
// ═════════════════════════════════════════════════════════════════════════════
export async function ingestPOSData(data: Array<{date: string; sku: string; channel: string; actual_sales: number}>, dataset_version: string) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/demand-sensing/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, dataset_version }),
  });
  if (!res.ok) throw new Error('POS ingestion failed');
  return res.json();
}

export async function getRecentSignals(dataset_version: string, sku = '', hours = 24) {
  const url = new URL(`${NEXT_PUBLIC_API_URL}/api/demand-sensing/signals`);
  url.searchParams.set('dataset_version', dataset_version);
  if (sku) url.searchParams.set('sku', sku);
  url.searchParams.set('hours', String(hours));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch signals');
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// Causal Forecasting APIs
// ═════════════════════════════════════════════════════════════════════════════
export async function generateCausalForecast(params: {
  dataset_version: string;
  sku: string;
  exog_variables: Record<string, number[]>;
  horizon?: number;
  model?: string;
}) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/causal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Causal forecast failed');
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// Event Calendar APIs
// ═════════════════════════════════════════════════════════════════════════════
export async function createEvent(event: {
  name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  impact_pct: number;
  affected_categories: string[];
}) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/events/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Event creation failed');
  return res.json();
}

export async function listEvents(filters: { start_date?: string; end_date?: string; event_type?: string } = {}) {
  const url = new URL(`${NEXT_PUBLIC_API_URL}/api/events`);
  Object.entries(filters).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function generateEventBasedForecast(dataset_version: string, sku: string, horizon = 12, include_events = true) {
  const url = new URL(`${NEXT_PUBLIC_API_URL}/api/forecast/event-based`);
  url.searchParams.set('dataset_version', dataset_version);
  url.searchParams.set('sku', sku);
  url.searchParams.set('horizon', String(horizon));
  url.searchParams.set('include_events', String(include_events));
  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) throw new Error('Event-based forecast failed');
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// Priority 1 Enhancement APIs
// ═════════════════════════════════════════════════════════════════════════════

export async function autoMLForecast(dataset_version: string, sku: string, horizon = 12, tune = true) {
  const url = `${NEXT_PUBLIC_API_URL}/api/forecast/automl?dataset_version=${dataset_version}&sku=${sku}&horizon=${horizon}&tune_hyperparams=${tune}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('AutoML forecast failed');
  return res.json();
}

export async function batchForecast(dataset_version: string, skus: string[], horizon = 12, model = 'xgboost') {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_version, skus, horizon, model }),
  });
  if (!res.ok) throw new Error('Batch forecast failed');
  return res.json();
}

export async function getDynamicSafetyStock(sku: string, dataset_version: string, service_level = 0.95, lead_time_std = 0) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/inventory/safety-stock/dynamic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, dataset_version, service_level, lead_time_std }),
  });
  if (!res.ok) throw new Error('Dynamic SS calculation failed');
  return res.json();
}

export async function optimizeServiceLevel(sku: string, dataset_version: string, unit_cost: number) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/inventory/service-level/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, dataset_version, unit_cost }),
  });
  if (!res.ok) throw new Error('SL optimization failed');
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// Priority 2+3 API Functions (ALL remaining)
// ═════════════════════════════════════════════════════════════════════════════

export async function getDynamicROP(sku: string, dataset_version: string, service_level = 0.95) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/inventory/rop/dynamic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku, dataset_version, service_level }) });
  return res.json();
}

export async function reconcileForecasts(dataset_version: string, horizon = 12) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/reconcile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, horizon }) });
  return res.json();
}

export async function detectSeasonality(dataset_version: string, sku: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/detect-seasonality?dataset_version=${dataset_version}&sku=${sku}`).then(r => r.json());
}

export async function detectOutliers(dataset_version: string, sku: string, method = 'iqr') {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/detect-outliers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, sku, method }) });
  return res.json();
}

export async function saveForecastVersion(dataset_version: string, sku: string, model_name: string, forecast_values: number[], notes = '') {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/save-version`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, sku, model_name, forecast_values, notes }) });
  return res.json();
}

export async function listForecastVersions(dataset_version: string, sku: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/versions?dataset_version=${dataset_version}&sku=${sku}`).then(r => r.json());
}

export async function getInventoryHealthScore(dataset_version: string, sku: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/inventory/health-score?dataset_version=${dataset_version}&sku=${sku}`).then(r => r.json());
}

export async function diffDatasetVersions(version_a: string, version_b: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/datasets/diff?version_a=${version_a}&version_b=${version_b}`).then(r => r.json());
}

export async function getOptimizedEnsemble(dataset_version: string, sku: string, horizon = 12) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/ensemble/optimized`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, sku, horizon }) });
  return res.json();
}

export async function getBiasAnalysis(dataset_version: string, sku: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/bias-analysis?dataset_version=${dataset_version}&sku=${sku}`).then(r => r.json());
}

export async function getSensitivityAnalysis(dataset_version: string, sku: string) {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/forecast/sensitivity`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, sku }) });
  return res.json();
}

export async function executeNetworkTransfers(transfers: any[], format = 'SAP') {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/inventory/network-transfers/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transfers, output_format: format }) });
  return res.json();
}

export async function detectAnomalies(dataset_version: string, sku = '') {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/analytics/anomaly-detection`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_version, sku }) });
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// S&OP / IBP API Functions
// ═════════════════════════════════════════════════════════════════════════════

export async function getIBPCycleStatus(dataset_version = '') {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/sop/ibp-cycle-status?dataset_version=${dataset_version}`).then(r => r.json());
}

export async function reconcileSOPPlans(dataset_version: string, airFreight = false, subcontractorFlex = false) {
  const url = `${NEXT_PUBLIC_API_URL}/api/sop/reconcile-plans?dataset_version=${dataset_version}&air_freight_enabled=${airFreight}&subcontractor_flex=${subcontractorFlex}`;
  return fetch(url, { method: 'POST' }).then(r => r.json());
}

export async function compareSOPScenarios(dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/sop/scenario-compare?dataset_version=${dataset_version}`, { method: 'POST' }).then(r => r.json());
}

export async function getStrategicHorizon(dataset_version: string, years = 3) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/sop/strategic-horizon?dataset_version=${dataset_version}&years=${years}`).then(r => r.json());
}

// ═════════════════════════════════════════════════════════════════════════════
// Financial Planning APIs
// ═════════════════════════════════════════════════════════════════════════════

export async function getCashFlow(dataset_version: string, months = 12, dso = 45, dpo = 30, opening_cash = 5000000) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/finance/cash-flow?dataset_version=${dataset_version}&months=${months}&dso=${dso}&dpo=${dpo}&opening_cash=${opening_cash}`).then(r => r.json());
}

export async function getBudgetPlan(dataset_version: string, growth_target_pct = 8) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/finance/budget?dataset_version=${dataset_version}&growth_target_pct=${growth_target_pct}`).then(r => r.json());
}

export async function getProfitability(dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/finance/profitability?dataset_version=${dataset_version}`).then(r => r.json());
}

export async function getWorkingCapital(dataset_version: string, dso = 45, dpo = 30) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/finance/working-capital?dataset_version=${dataset_version}&dso=${dso}&dpo=${dpo}`).then(r => r.json());
}

// Digital Twin — demand shock & Monte Carlo
export async function runDemandShock(dataset_version: string, shock_pct: number, shock_type: string, duration_weeks = 4, propagation_weeks = 12) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/twin/demand-shock?dataset_version=${dataset_version}&shock_pct=${shock_pct}&shock_type=${shock_type}&duration_weeks=${duration_weeks}&propagation_weeks=${propagation_weeks}`, { method: 'POST' }).then(r => r.json());
}
export async function runMonteCarlo(dataset_version: string, iterations = 1000, demand_cv = 0.25, lead_time_cv = 0.30, service_target = 95) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/twin/monte-carlo?dataset_version=${dataset_version}&iterations=${iterations}&demand_cv=${demand_cv}&lead_time_cv=${lead_time_cv}&service_target=${service_target}`, { method: 'POST' }).then(r => r.json());
}

// Category Management — strategic roles
export async function getCategoryRoles(dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/category/roles?dataset_version=${dataset_version}`).then(r => r.json());
}

// Pricing & Promotion
export async function getPriceElasticity(dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/pricing/elasticity?dataset_version=${dataset_version}`).then(r => r.json());
}
export async function simulatePrice(dataset_version: string, price_change_pct: number, category = '') {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/pricing/simulate?dataset_version=${dataset_version}&price_change_pct=${price_change_pct}&category=${category}`, { method: 'POST' }).then(r => r.json());
}
export async function getPromoROI(dataset_version: string, discount_pct: number, promo_lift_pct: number, promo_weeks = 2) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/pricing/promo-roi?dataset_version=${dataset_version}&discount_pct=${discount_pct}&promo_lift_pct=${promo_lift_pct}&promo_weeks=${promo_weeks}`, { method: 'POST' }).then(r => r.json());
}
export async function getDynamicPricing(dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/pricing/dynamic?dataset_version=${dataset_version}`).then(r => r.json());
}

// Execution Systems — integration control plane
export async function getConnectors() {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/execution/connectors`).then(r => r.json());
}
export async function generateExecutionDoc(doc_type: string, target_system: string, dataset_version: string) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/execution/generate-document?doc_type=${doc_type}&target_system=${target_system}&dataset_version=${dataset_version}`, { method: 'POST' }).then(r => r.json());
}
export async function getApiRegistry() {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/execution/api-registry`).then(r => r.json());
}
export async function getEventStream(limit = 25) {
  return fetch(`${NEXT_PUBLIC_API_URL}/api/execution/event-stream?limit=${limit}`).then(r => r.json());
}
