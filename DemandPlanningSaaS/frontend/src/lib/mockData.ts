// ─────────────────────────────────────────────────────────────────────────────
// Planora AI — Mock Data & Offline Forecasting Simulation
// ─────────────────────────────────────────────────────────────────────────────

import type { ForecastPoint } from '@/types';

// Helper for seeded random numbers to prevent chart flickering on state change
function seededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

export const ERROR_ANALYSIS_MODELS = [
  { id: 'sma', name: 'Simple Moving Average', type: 'Statistical', mae: 12.4, rmse: 16.2, mape: 7.8 },
  { id: 'ses', name: 'Simple Exponential Smoothing', type: 'Statistical', mae: 11.2, rmse: 14.8, mape: 6.9 },
  { id: 'holt-winters', name: 'Holt-Winters (Triple Exp)', type: 'Statistical', mae: 8.5, rmse: 11.2, mape: 4.8 },
  { id: 'arima', name: 'ARIMA (1,1,1)', type: 'Statistical', mae: 9.1, rmse: 12.1, mape: 5.4 },
  { id: 'xgboost', name: 'XGBoost Regressor', type: 'Machine Learning', mae: 6.8, rmse: 9.5, mape: 3.9 },
  { id: 'lightgbm', name: 'LightGBM Regressor', type: 'Machine Learning', mae: 7.1, rmse: 9.9, mape: 4.1 },
];

export function calculateDeterministicForecast(
  history: any[],
  model: string,
  params: { window?: number; alpha?: number; estimators?: number; arimaOrder?: string },
  horizon: number,
  horizonUnit: string,
  consensusAdjustments: Record<string, number>,
  skuId: string
): ForecastPoint[] {
  const chartData: ForecastPoint[] = [];
  const rand = seededRandom(skuId + model + horizon);

  // 1. Add historical points
  history.forEach((h) => {
    const period = h.period || h.date;
    chartData.push({
      period,
      actual: h.actual,
      forecast: h.forecast || null,
      consensusVolume: h.actual,
      isHistorical: true,
    });
  });

  // 2. Generate future forecast baseline
  const actuals = history.map((h) => h.actual).filter((v) => typeof v === 'number');
  const lastActual = actuals[actuals.length - 1] || 100;

  let baseline = lastActual;
  let trend = 0;

  if (model === 'sma') {
    const windowSize = params.window || 3;
    const windowVals = actuals.slice(-windowSize);
    baseline = windowVals.reduce((a, b) => a + b, 0) / (windowVals.length || 1);
  } else if (model === 'ses') {
    const alpha = params.alpha || 0.3;
    let sesVal = actuals[0] || 100;
    for (let i = 1; i < actuals.length; i++) {
      sesVal = alpha * actuals[i] + (1 - alpha) * sesVal;
    }
    baseline = sesVal;
  } else if (model === 'holt' || model === 'holt-winters') {
    const alpha = params.alpha || 0.3;
    const beta = 0.1;
    let level = actuals[0] || 100;
    let tVal = 0;
    for (let i = 1; i < actuals.length; i++) {
      const prevLevel = level;
      level = alpha * actuals[i] + (1 - alpha) * (level + tVal);
      tVal = beta * (level - prevLevel) + (1 - beta) * tVal;
    }
    baseline = level;
    trend = tVal;
  } else if (model === 'arima' || model === 'sarima' || model === 'sarimax') {
    baseline = lastActual * 0.95;
    trend = 1.2;
  } else {
    // Machine learning (xgboost, lightgbm, decision-tree, random-forest)
    baseline = lastActual * 1.02;
    trend = 0.8;
  }

  // Generate labels for future periods
  const lastDateStr = history[history.length - 1]?.period || history[history.length - 1]?.date || '';
  const futurePeriods: string[] = [];
  if (lastDateStr.startsWith('Day')) {
    const lastDayNum = parseInt(lastDateStr.replace('Day ', '')) || 0;
    for (let i = 0; i < horizon; i++) {
      const sign = lastDayNum + i + 1 >= 0 ? '+' : '';
      futurePeriods.push(`Day ${sign}${lastDayNum + i + 1}`);
    }
  } else {
    let lastDate = new Date(lastDateStr);
    if (isNaN(lastDate.getTime())) lastDate = new Date();
    let isMonthly = true;
    if (history.length >= 2) {
      const d1 = new Date(history[history.length - 2].period || history[history.length - 2].date);
      const d2 = new Date(history[history.length - 1].period || history[history.length - 1].date);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffDays = Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 15) isMonthly = false;
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

  // Generate future points
  for (let i = 0; i < horizon; i++) {
    const period = futurePeriods[i];
    let val = baseline + trend * (i + 1);
    
    // Simple mock seasonality
    const seasonalFactor = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.1;
    val = val * seasonalFactor;

    // Small random noise (0.95 to 1.05) using seeded random
    const noise = 0.95 + rand() * 0.1;
    val = val * noise;

    // ML estimator adjustment
    if (model.includes('tree') || model.includes('forest') || model.includes('boost') || model.includes('gbm')) {
      const ests = params.estimators || 100;
      val = val * (1 + (ests - 100) / 10000);
    }

    const forecastVal = Math.max(0, Math.round(val));
    const adj = consensusAdjustments[period] || 0;
    const consensusVal = Math.round(forecastVal * (1 + adj / 100));

    chartData.push({
      period,
      actual: null,
      forecast: forecastVal,
      lowerBound: Math.max(0, Math.round(forecastVal * 0.85)),
      upperBound: Math.round(forecastVal * 1.15),
      consensusVolume: consensusVal,
      isHistorical: false,
    });
  }

  return chartData;
}

export function getDemandAccuracyData() {
  return [
    { month: 'Jun 25', actual: 1200, forecast: 1150 },
    { month: 'Jul 25', actual: 1350, forecast: 1300 },
    { month: 'Aug 25', actual: 1100, forecast: 1150 },
    { month: 'Sep 25', actual: 1450, forecast: 1400 },
    { month: 'Oct 25', actual: 1600, forecast: 1550 },
    { month: 'Nov 25', actual: 1850, forecast: 1750 },
    { month: 'Dec 25', actual: 2300, forecast: 2100 },
    { month: 'Jan 26', actual: 1400, forecast: 1450 },
    { month: 'Feb 26', actual: 1300, forecast: 1350 },
    { month: 'Mar 26', actual: 1550, forecast: 1500 },
    { month: 'Apr 26', actual: 1650, forecast: 1600 },
    { month: 'May 26', actual: 1800, forecast: 1720 },
  ];
}

export function getServiceTrendData() {
  return [
    { week: 'Wk 13', otif: 92.1, fillRate: 96.5 },
    { week: 'Wk 14', otif: 93.4, fillRate: 97.1 },
    { week: 'Wk 15', otif: 91.8, fillRate: 96.8 },
    { week: 'Wk 16', otif: 94.2, fillRate: 98.0 },
    { week: 'Wk 17', otif: 92.9, fillRate: 97.4 },
    { week: 'Wk 18', otif: 93.5, fillRate: 97.9 },
    { week: 'Wk 19', otif: 94.0, fillRate: 98.2 },
    { week: 'Wk 20', otif: 93.1, fillRate: 97.6 },
    { week: 'Wk 21', otif: 93.6, fillRate: 97.8 },
    { week: 'Wk 22', otif: 92.8, fillRate: 97.5 },
    { week: 'Wk 23', otif: 93.4, fillRate: 97.8 },
    { week: 'Wk 24', otif: 93.8, fillRate: 98.1 },
  ];
}

export const STOCKOUT_EVENTS = 14;

export const SUPPLIER_DATA = [
  { name: 'Apex Electronics Mfg', leadTimeAvg: 45, leadTimeVar: 14, otif: 88.5, util: 92, risk: 'High' },
  { name: 'Global Logistics Corp', leadTimeAvg: 12, leadTimeVar: 2, otif: 97.2, util: 75, risk: 'Low' },
  { name: 'Summit Parts Supplier', leadTimeAvg: 30, leadTimeVar: 6, otif: 91.4, util: 82, risk: 'Medium' },
  { name: 'Pacific Component Corp', leadTimeAvg: 20, leadTimeVar: 4, otif: 94.8, util: 80, risk: 'Low' },
  { name: 'Tech Assembly Partners', leadTimeAvg: 15, leadTimeVar: 3, otif: 96.1, util: 88, risk: 'Low' },
];
