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
