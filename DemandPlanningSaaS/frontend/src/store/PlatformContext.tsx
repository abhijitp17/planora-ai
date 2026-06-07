'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { SKU, AppNotification, ModuleId, ForecastPoint } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────
interface PlatformState {
  // Navigation
  activeModule: ModuleId;
  activeTab: string;
  isSidebarCollapsed: boolean;

  // Data
  skuDatabase: SKU[];
  isLoadingData: boolean;
  selectedSkuId: string;
  availableDatasets: string[];
  selectedDataset: string;

  // Demand / Forecast
  forecastModel: string;
  horizonUnit: string;
  horizon: number;
  smaWindow: number;
  emaAlpha: number;
  mlEstimators: number;
  arimaOrder: string;
  consensusAdjustments: Record<string, number>;
  apiForecastData: ForecastPoint[] | null;
  apiForecastMetrics: Record<string, { mae: number; rmse: number; mape: number }> | null;
  isForecastLoading: boolean;

  // Inventory
  targetServiceLevel: number;

  // Finance sim
  financeSim: { volumePct: number; pricePct: number; costPct: number; promoUplift: number; capExpPct: number };

  // UI
  isDarkMode: boolean;
  isCopilotOpen: boolean;
  isGenerating: boolean;
  apiStatus: 'checking' | 'online' | 'offline';

  // SKU filters
  searchQuery: string;
  selectedCategory: string;

  // Notifications
  notifications: AppNotification[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_MODULE'; payload: ModuleId }
  | { type: 'SET_TAB'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SKU_DATABASE'; payload: SKU[] }
  | { type: 'SET_LOADING_DATA'; payload: boolean }
  | { type: 'SET_SELECTED_SKU'; payload: string }
  | { type: 'SET_DATASETS'; payload: string[] }
  | { type: 'SET_SELECTED_DATASET'; payload: string }
  | { type: 'SET_FORECAST_MODEL'; payload: string }
  | { type: 'SET_HORIZON_UNIT'; payload: string }
  | { type: 'SET_HORIZON'; payload: number }
  | { type: 'SET_SMA_WINDOW'; payload: number }
  | { type: 'SET_EMA_ALPHA'; payload: number }
  | { type: 'SET_ML_ESTIMATORS'; payload: number }
  | { type: 'SET_ARIMA_ORDER'; payload: string }
  | { type: 'SET_CONSENSUS'; payload: Record<string, number> }
  | { type: 'SET_API_FORECAST'; payload: { data: ForecastPoint[]; metrics: any } }
  | { type: 'SET_FORECAST_LOADING'; payload: boolean }
  | { type: 'SET_SERVICE_LEVEL'; payload: number }
  | { type: 'SET_FINANCE_SIM'; payload: Partial<PlatformState['financeSim']> }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_COPILOT' }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_API_STATUS'; payload: PlatformState['apiStatus'] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET_COPILOT_OPEN'; payload: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────
const initialState: PlatformState = {
  activeModule: 'demand',
  activeTab: 'overview',
  isSidebarCollapsed: false,
  skuDatabase: [],
  isLoadingData: true,
  selectedSkuId: '',
  availableDatasets: [],
  selectedDataset: '',
  forecastModel: 'xgboost',
  horizonUnit: 'Month',
  horizon: 6,
  smaWindow: 3,
  emaAlpha: 0.3,
  mlEstimators: 100,
  arimaOrder: '1,1,1',
  consensusAdjustments: {},
  apiForecastData: null,
  apiForecastMetrics: null,
  isForecastLoading: false,
  targetServiceLevel: 95,
  financeSim: { volumePct: 0, pricePct: 0, costPct: 0, promoUplift: 0, capExpPct: 0 },
  isDarkMode: false,
  isCopilotOpen: false,
  isGenerating: false,
  apiStatus: 'checking',
  searchQuery: '',
  selectedCategory: 'All',
  notifications: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────
function reducer(state: PlatformState, action: Action): PlatformState {
  switch (action.type) {
    case 'SET_MODULE':      return { ...state, activeModule: action.payload, activeTab: 'overview' };
    case 'SET_TAB':         return { ...state, activeTab: action.payload };
    case 'TOGGLE_SIDEBAR':  return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
    case 'SET_SKU_DATABASE': return { ...state, skuDatabase: action.payload, isLoadingData: false };
    case 'SET_LOADING_DATA': return { ...state, isLoadingData: action.payload };
    case 'SET_SELECTED_SKU': return { ...state, selectedSkuId: action.payload };
    case 'SET_DATASETS':    return { ...state, availableDatasets: action.payload };
    case 'SET_SELECTED_DATASET': return { ...state, selectedDataset: action.payload };
    case 'SET_FORECAST_MODEL': return { ...state, forecastModel: action.payload };
    case 'SET_HORIZON_UNIT': return { ...state, horizonUnit: action.payload };
    case 'SET_HORIZON':     return { ...state, horizon: action.payload };
    case 'SET_SMA_WINDOW':  return { ...state, smaWindow: action.payload };
    case 'SET_EMA_ALPHA':   return { ...state, emaAlpha: action.payload };
    case 'SET_ML_ESTIMATORS': return { ...state, mlEstimators: action.payload };
    case 'SET_ARIMA_ORDER': return { ...state, arimaOrder: action.payload };
    case 'SET_CONSENSUS':   return { ...state, consensusAdjustments: action.payload };
    case 'SET_API_FORECAST': return { ...state, apiForecastData: action.payload.data, apiForecastMetrics: action.payload.metrics };
    case 'SET_FORECAST_LOADING': return { ...state, isForecastLoading: action.payload };
    case 'SET_SERVICE_LEVEL': return { ...state, targetServiceLevel: action.payload };
    case 'SET_FINANCE_SIM': return { ...state, financeSim: { ...state.financeSim, ...action.payload } };
    case 'TOGGLE_DARK_MODE': return { ...state, isDarkMode: !state.isDarkMode };
    case 'TOGGLE_COPILOT':  return { ...state, isCopilotOpen: !state.isCopilotOpen };
    case 'SET_COPILOT_OPEN': return { ...state, isCopilotOpen: action.payload };
    case 'SET_GENERATING':  return { ...state, isGenerating: action.payload };
    case 'SET_API_STATUS':  return { ...state, apiStatus: action.payload };
    case 'SET_SEARCH':      return { ...state, searchQuery: action.payload };
    case 'SET_CATEGORY':    return { ...state, selectedCategory: action.payload };
    case 'ADD_NOTIFICATION': return {
      ...state,
      notifications: [action.payload, ...state.notifications].slice(0, 50),
    };
    case 'MARK_ALL_READ': return {
      ...state,
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    };
    default: return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface PlatformContextValue {
  state: PlatformState;
  dispatch: React.Dispatch<Action>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <PlatformContext.Provider value={{ state, dispatch }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}

// Convenience selector hook
export function usePlatformState(): PlatformState {
  return usePlatform().state;
}
