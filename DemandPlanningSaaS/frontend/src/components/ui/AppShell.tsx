'use client';

import React, { Suspense, lazy, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, Package, Stethoscope, Briefcase, DollarSign, BarChart2,
  BrainCircuit, Gauge, Upload, Bell, Sparkles, Sun, Moon, Search,
  ChevronLeft, ChevronRight, CheckCircle2, Tag, Menu, User,
  LogOut, Settings, Shield, AlertTriangle, Activity, Database, Network, Store, ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { usePlatform } from '@/store/PlatformContext';
import { useToast } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useAudit, AUDIT_ACTIONS } from '@/hooks/useAudit';
import { StatusBadge } from '@/components/ui/StatusBadge';
import DataExplorer from '@/components/ui/DataExplorer';
import AdminGovernancePanel from '@/components/ui/AdminGovernancePanel';
import { DashboardSkeleton, KPISkeletonRow, SidebarSkeleton } from '@/components/ui/Skeletons';
import CopilotPanel from '@/components/ui/CopilotPanel';
import LoginPage from '@/components/ui/LoginPage';
import { uploadDataset, generateForecast, checkHealth, buildChartData } from '@/lib/api';
import { type ModuleId, CURRENCIES } from '@/types';

// ─── Lazy-loaded modules ──────────────────────────────────────────────────────
const DemandModule      = lazy(() => import('@/modules/demand'));
const InventoryModule   = lazy(() => import('@/modules/inventory'));
const DiagnosticsModule = lazy(() => import('@/modules/diagnostics'));
const SOPModule         = lazy(() => import('@/modules/sop'));
const FinanceModule     = lazy(() => import('@/modules/finance'));
const AnalyticsModule   = lazy(() => import('@/modules/analytics'));
const BIModule          = lazy(() => import('@/modules/bi'));
const TwinModule        = lazy(() => import('@/modules/twin'));
const RetailModule      = lazy(() => import('@/modules/retail'));
const PricingModule     = lazy(() => import('@/modules/pricing'));
const ExecutionModule   = lazy(() => import('@/modules/execution'));

// ─── Module registry ──────────────────────────────────────────────────────────
const MODULE_DEFS = [
  { id: 'demand' as ModuleId,      label: 'Demand Planning',        icon: <TrendingUp size={18}/>,  minRole: 'viewer',  tabs: [{ id:'overview', label:'Overview' }, { id:'editor', label:'Forecast Editor' }, { id:'analysis', label:'Performance' }, { id:'npi', label:'NPI' }, { id:'sensing', label:'Demand Sensing' }, { id:'causal', label:'Causal Forecasting' }, { id:'events', label:'Event Calendar' }, { id:'promo', label:'Promotion Planning' }, { id:'sensitivity', label:'Sensitivity' }, { id:'versions', label:'Versions' }] },
  { id: 'inventory' as ModuleId,   label: 'Inventory Optimization', icon: <Package size={18}/>,     minRole: 'viewer',  tabs: [{ id:'overview', label:'Network Dashboard' }, { id:'safety_stock', label:'Safety Stock' }, { id:'replenishment', label:'Replenishment' }, { id:'abc_xyz', label:'ABC/XYZ Segmentation' }, { id:'multi_echelon', label:'Multi-Echelon' }, { id:'balancing', label:'Network Balancing' }, { id:'health', label:'Health Score' }] },
  { id: 'diagnostics' as ModuleId, label: 'SC Diagnostics',         icon: <Stethoscope size={18}/>, minRole: 'planner', tabs: [{ id:'overview', label:'HOTW Tracker' }, { id:'entropy', label:'Entropy Scanner' }] },
  { id: 'sop' as ModuleId,         label: 'S&OP / IBP',             icon: <Briefcase size={18}/>,   minRole: 'manager', tabs: [{ id:'cycle', label:'IBP Cycle' }, { id:'overview', label:'Executive Review' }, { id:'balancing', label:'RCCP Balancing' }, { id:'finance', label:'Financial Reconciliation' }, { id:'scenarios', label:'Scenario S&OP' }, { id:'strategic', label:'Strategic Horizon' }] },
  { id: 'finance' as ModuleId,     label: 'Financial Simulation',   icon: <DollarSign size={18}/>,  minRole: 'manager', tabs: [{ id:'overview', label:'Scenario Simulation' }, { id:'optimization', label:'Product Mix' }, { id:'plan', label:'Master Plan' }, { id:'cashflow', label:'Cash Flow' }, { id:'budget', label:'Budget Planning' }, { id:'profitability', label:'Profitability' }, { id:'workingcapital', label:'Working Capital' }] },
  { id: 'analytics' as ModuleId,   label: 'Global Analytics',       icon: <BarChart2 size={18}/>,   minRole: 'viewer',  tabs: [{ id:'overview', label:'Demand & Sales' }, { id:'inventory', label:'Inventory Health' }, { id:'service', label:'Service & Fulfillment' }, { id:'supply', label:'Supplier & Capacity' }, { id:'financial', label:'Financial Capital' }, { id:'ai', label:'✨ AI Insights' }, { id:'prescriptive', label:'Prescriptive Actions' }, { id:'autonomous', label:'Autonomous Planning' }] },
  { id: 'bi' as ModuleId,          label: 'Business Intelligence',  icon: <Database size={18}/>,    minRole: 'viewer',  tabs: [{ id:'sources', label:'Data Sources' }, { id:'query', label:'Visual Query Builder' }, { id:'dashboards', label:'Custom Dashboards' }, { id:'semantic', label:'Semantic Layer' }, { id:'catalogue', label:'Metric Catalogue' }] },
  { id: 'twin' as ModuleId,        label: 'Digital Twin & Scenarios', icon: <Network size={18}/>,   minRole: 'planner', tabs: [{ id:'network', label:'Network Topology' }, { id:'scenarios', label:'Scenario Sandbox' }, { id:'impact', label:'Impact Analysis' }, { id:'shock', label:'Demand Shock' }, { id:'montecarlo', label:'Risk (Monte Carlo)' }] },
  { id: 'retail' as ModuleId,      label: 'Retail & Category',      icon: <Store size={18}/>,       minRole: 'planner', tabs: [{ id:'overview', label:'Category Overview' }, { id:'assortment', label:'Assortment & Merchandising' }, { id:'space', label:'Space Planning' }, { id:'demand', label:'Retail Demand' }, { id:'scorecard', label:'Category Scorecard' }, { id:'lifecycle', label:'Product Lifecycle' }, { id:'longtail', label:'Long Tail & Rationalization' }, { id:'cannibalization', label:'Cannibalization' }, { id:'roles', label:'Category Roles' }] },
  { id: 'pricing' as ModuleId,     label: 'Pricing & Promotion',    icon: <Tag size={18}/>,         minRole: 'planner', tabs: [{ id:'elasticity', label:'Price Elasticity' }, { id:'simulate', label:'Price Simulation' }, { id:'promo', label:'Promotion ROI' }, { id:'dynamic', label:'Dynamic Pricing' }] },
  { id: 'execution' as ModuleId,   label: 'Execution Systems',      icon: <ArrowRightLeft size={18}/>, minRole: 'manager', tabs: [{ id:'connectors', label:'Connectors' }, { id:'documents', label:'Outbound Documents' }, { id:'apis', label:'API & Webhooks' }, { id:'events', label:'Event Stream' }] },
  { id: 'governance' as ModuleId,  label: 'Governance & Admin',     icon: <Shield size={18}/>,      minRole: 'manager', tabs: [{ id:'approvals', label:'Workflow Approvals' }, { id:'master', label:'Master Data' }] },
];

const ROLE_RANK: Record<string, number> = { viewer: 0, planner: 1, manager: 2, admin: 3 };

// ─── PlanoraLogo ──────────────────────────────────────────────────────────────
function PlanoraLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', fontFamily:'var(--font-sans)', fontSize:'1.2rem', fontWeight:700, color:'var(--text-main)', letterSpacing:'-0.02em', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', flexShrink:0 }}>
        <span style={{ display:'block', width:'6px', height:'12px', borderRadius:'3px 3px 0 0', background:'var(--accent-primary)' }} />
        <span style={{ display:'block', width:'6px', height:'20px', borderRadius:'3px 3px 0 0', background:'var(--accent-primary)' }} />
        <span style={{ display:'block', width:'6px', height:'8px', borderRadius:'3px 3px 0 0', background:'#f97316', opacity:0.9 }} />
      </div>
      {!collapsed && <span>Planora <span style={{ color:'var(--accent-primary)' }}>AI</span></span>}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:   { bg:'#f5f3ff', color:'#7c3aed' },
  manager: { bg:'#fffbeb', color:'#d97706' },
  planner: { bg:'#eff6ff', color:'#2563eb' },
  viewer:  { bg:'#f0fdf4', color:'#16a34a' },
};

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? { bg:'var(--bg-hover)', color:'var(--text-muted)' };
  return (
    <span style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'2px 7px', borderRadius:'4px', background:s.bg, color:s.color }}>
      {role}
    </span>
  );
}

// ─── Module component switcher ────────────────────────────────────────────────
function ActiveModule({ moduleId }: { moduleId: ModuleId }) {
  switch (moduleId) {
    case 'demand':      return <DemandModule />;
    case 'inventory':   return <InventoryModule />;
    case 'diagnostics': return <DiagnosticsModule />;
    case 'sop':         return <SOPModule />;
    case 'finance':     return <FinanceModule />;
    case 'analytics':   return <AnalyticsModule />;
    case 'governance':  return <AdminGovernancePanel />;
    case 'bi':          return <BIModule />;
    case 'twin':        return <TwinModule />;
    case 'retail':      return <RetailModule />;
    case 'pricing':     return <PricingModule />;
    case 'execution':   return <ExecutionModule />;
    default:            return <div style={{ padding:'2rem', color:'var(--text-muted)' }}>Module not found.</div>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AppShell — the main authenticated layout
// ─────────────────────────────────────────────────────────────────────────────
export default function AppShell() {
  const { user, isLoading, isAuthenticated, can, hasRole, logout } = useAuth();
  const { state, dispatch } = usePlatform();
  const toast = useToast();
  const { log: auditLog } = useAudit();
  
  // Phase 6: Keyboard shortcuts
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  useKeyboardShortcuts({
    onModuleSwitch: (mod) => dispatch({ type: 'SET_MODULE', payload: mod }),
    onCopilotToggle: () => dispatch({ type: 'TOGGLE_COPILOT' }),
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => { setIsProfileOpen(false); setIsNotifOpen(false); },
  }, isAuthenticated);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isSkuPaneCollapsed, setIsSkuPaneCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planora_sku_pane_collapsed') === 'true';
    }
    return false;
  });

  const {
    activeModule, activeTab, isSidebarCollapsed, isDarkMode, isCopilotOpen,
    skuDatabase, isLoadingData, selectedSkuId, searchQuery, selectedCategory,
    apiStatus, availableDatasets, selectedDataset, isForecastLoading, isGenerating,
    horizon, horizonUnit, forecastModel, consensusAdjustments, notifications,
  } = state;

  // ── Dark mode effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [isDarkMode]);

  // ── Programmatic shell tab switcher ─────────────────────────────────────────
  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      dispatch({ type: 'SET_TAB', payload: customEvent.detail });
    };
    window.addEventListener('set-shell-tab', handleSetTab);
    return () => window.removeEventListener('set-shell-tab', handleSetTab);
  }, [dispatch]);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/m5_data.json')
      .then(r => r.json())
      .then(data => {
        const mapped = data.map((d: any) => ({ ...d, history: d.historicalData?.map((h: any) => ({ ...h, isHistorical: true })) ?? [] }));
        dispatch({ type: 'SET_SKU_DATABASE', payload: mapped });
        if (mapped.length) dispatch({ type: 'SET_SELECTED_SKU', payload: mapped[0].id });
      })
      .catch(() => dispatch({ type: 'SET_LOADING_DATA', payload: false }));
  }, [isAuthenticated]);

  // ── API health check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    checkHealth()
      .then(() => dispatch({ type: 'SET_API_STATUS', payload: 'online' }))
      .catch(() => dispatch({ type: 'SET_API_STATUS', payload: 'offline' }));
  }, [isAuthenticated]);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info('Uploading dataset…', file.name);
    try {
      const data = await uploadDataset(file);
      dispatch({ type: 'SET_DATASETS', payload: [...new Set([...availableDatasets, data.dataset_version])] });
      dispatch({ type: 'SET_SELECTED_DATASET', payload: data.dataset_version });
      dispatch({ type: 'SET_API_STATUS', payload: 'online' });
      auditLog(AUDIT_ACTIONS.UPLOAD_DATASET, { filename: data.filename, records: data.records_processed }, data.dataset_version);
      toast.success('Dataset ingested', `${data.filename} · ${data.records_processed.toLocaleString()} records`);
    } catch (err: any) {
      toast.error('Upload failed', err?.message ?? 'Check backend is running on port 8000.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [availableDatasets, toast, dispatch]);

  // ── Run forecast ────────────────────────────────────────────────────────────
  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];
  const runForecast = useCallback(async () => {
    if (!selectedDataset || !selectedSku) {
      toast.warning('No dataset', 'Upload a dataset first.');
      return;
    }
    dispatch({ type: 'SET_FORECAST_LOADING', payload: true });
    try {
      const result = await generateForecast({ dataset_version: selectedDataset, sku: selectedSku.id, horizon });
      const mk = (['hw','arima','xgboost','ensemble'].includes(forecastModel) ? forecastModel : 'ensemble') as any;
      dispatch({ type: 'SET_API_FORECAST', payload: { data: buildChartData(result, mk, consensusAdjustments) as any, metrics: result.backtest_metrics } });
      auditLog(AUDIT_ACTIONS.RUN_FORECAST, { sku: selectedSku.id, model: forecastModel, horizon }, selectedDataset);
      toast.success('Forecast generated', `${selectedSku.id} · ${horizon} periods`);
    } catch (err: any) {
      toast.error('Forecast failed', err?.message ?? 'Upload a dataset first.');
    } finally {
      dispatch({ type: 'SET_FORECAST_LOADING', payload: false });
    }
  }, [selectedDataset, selectedSku, horizon, forecastModel, consensusAdjustments, toast, dispatch]);

  // ── Periodic action ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (activeModule === 'demand') { runForecast(); return; }
    dispatch({ type: 'SET_GENERATING', payload: true });
    setTimeout(() => {
      dispatch({ type: 'SET_GENERATING', payload: false });
      dispatch({ type: 'ADD_NOTIFICATION', payload: {
        id: Date.now().toString(),
        message: `${activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} calculation completed.`,
        time: 'Just now', read: false, type: 'success',
      }});
    }, 2000);
  }, [activeModule, runForecast, dispatch]);

  // ── Filtered SKUs ────────────────────────────────────────────────────────────
  const categories = ['All', ...Array.from(new Set(skuDatabase.map(s => s.category)))];
  const filteredSkus = React.useMemo(() => skuDatabase.filter(sku => {
    const matchSearch = sku.name.toLowerCase().includes(searchQuery.toLowerCase()) || sku.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'All' || sku.category === selectedCategory;
    return matchSearch && matchCat;
  }), [skuDatabase, searchQuery, selectedCategory]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeMod = MODULE_DEFS.find(m => m.id === activeModule)!;
  const activeTabs = activeMod?.tabs ?? [];

  // ── Loading / auth gates ────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ height:'100vh', background:'var(--bg-main)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:'24px', height:'24px', borderWidth:'3px' }} />
    </div>
  );

  if (!isAuthenticated) return <LoginPage />;

  if (isLoadingData) return (
    <div style={{ height:'100vh', background:'var(--bg-main)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.5rem', padding:'2rem' }}>
      <PlanoraLogo />
      <DashboardSkeleton />
    </div>
  );

  return (
    <div className="app-layout">
      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="flex items-center gap-4">
          <div onClick={() => {}} style={{ cursor:'pointer', display:'flex' }}>
            <PlanoraLogo />
          </div>
          {/* API status */}
          <div className="api-status">
            <span className={`api-dot ${apiStatus}`} />
            <span>{apiStatus === 'checking' ? 'Connecting…' : apiStatus === 'online' ? 'API Online' : 'API Offline'}</span>
          </div>
          {selectedDataset && (
            <span style={{ fontSize:'0.72rem', color:'var(--accent-primary)', background:'var(--accent-primary-light)', padding:'3px 10px', borderRadius:'4px', fontWeight:600 }}>
              {selectedDataset}
            </span>
          )}
        </div>

        {/* Global ERPNext style Search Bar */}
        <div className="desk-search-container">
          <Search size={14} className="desk-search-icon" />
          <input 
            type="text" 
            className="desk-search-input" 
            placeholder="Search SKUs or type a command... (Ctrl + G)" 
            value={searchQuery}
            onChange={e => dispatch({ type:'SET_SEARCH', payload:e.target.value })}
            ref={searchInputRef}
          />
        </div>

        <div className="flex gap-2 items-center">
          {can('run:forecast') && (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating || isForecastLoading} aria-label="Run calculation" title="Run Planning Logic" style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              {(isGenerating || isForecastLoading) ? <><div className="spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', marginRight: '8px' }}/><span>Running…</span></> : <><BrainCircuit size={16} style={{ marginRight: '8px' }}/><span>{activeModule==='demand'?'Run Forecast':'Calculate'}</span></>}
            </button>
          )}
          {can('upload:dataset') && (
            <>
              <input type="file" ref={fileInputRef} style={{ display:'none' }} accept=".csv,.xlsx" onChange={handleFileUpload} />
              <button className="header-action-btn" onClick={() => fileInputRef.current?.click()} aria-label="Upload dataset" title="Upload Dataset">
                <Upload size={15}/>
              </button>
            </>
          )}
          {/* Notifications */}
          <div style={{ position:'relative' }}>
            <button className="header-action-btn" onClick={() => setIsNotifOpen(!isNotifOpen)} style={{ position:'relative' }} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} title="Alerts & Notifications">
              <Bell size={15}/>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {isNotifOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:'320px', background:'var(--bg-panel)', border:'1px solid var(--border-color)', borderRadius:'6px', zIndex:150, boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
                <div style={{ padding:'0.75rem 1rem', borderBottom:'1px solid var(--border-color)', fontWeight:600, fontSize:'0.85rem', display:'flex', justifyContent:'space-between', color:'var(--text-main)' }}>
                  Notifications
                  {unreadCount > 0 && <span onClick={() => { dispatch({ type:'MARK_ALL_READ' }); setIsNotifOpen(false); }} style={{ fontSize:'0.75rem', color:'var(--accent-primary)', cursor:'pointer' }}>Mark all read</span>}
                </div>
                <div style={{ maxHeight:'320px', overflowY:'auto' }}>
                  {notifications.length === 0
                    ? <div style={{ padding:'2.5rem 1rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>No notifications yet</div>
                    : notifications.map(n => (
                      <div key={n.id} style={{ padding:'0.75rem 1rem', borderBottom:'1px solid var(--border-color)', background:n.read?'transparent':'var(--bg-hover)', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                        <CheckCircle2 size={15} color="var(--status-good)" style={{ flexShrink:0, marginTop:'2px' }} />
                        <div>
                          <p style={{ margin:'0 0 3px', fontSize:'0.8rem', color:'var(--text-main)', fontWeight:n.read?400:600 }}>{n.message}</p>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{n.time}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          {/* Copilot */}
          <button className="header-action-btn" onClick={() => dispatch({ type:'TOGGLE_COPILOT' })} style={{ background:isCopilotOpen?'var(--accent-primary-light)':undefined, color:isCopilotOpen?'var(--accent-primary)':undefined }} aria-label="AI Copilot" aria-expanded={isCopilotOpen} title="AI Copilot">
            <Sparkles size={15}/>
          </button>
          {/* Profile & Dropdown with Theme */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              style={{ background:'var(--bg-hover)', border:'1px solid var(--border-color)', borderRadius:'20px', padding:'4px 10px 4px 6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}
              aria-label="Profile menu"
            >
              <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'var(--accent-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700 }}>
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-main)' }}>{user?.name?.split(' ')[0]}</span>
              <RoleBadge role={user?.role ?? 'viewer'} />
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown" style={{ width: '210px' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-color)' }}>
                  <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-main)' }}>{user?.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{user?.email}</div>
                </div>
                <button className="profile-dropdown-item"><User size={14}/> Profile Settings</button>
                {hasRole('admin') && <button className="profile-dropdown-item"><Shield size={14}/> Admin Panel</button>}
                
                {/* Theme toggle inside dropdown */}
                <button className="profile-dropdown-item" onClick={() => dispatch({ type:'TOGGLE_DARK_MODE' })} aria-label={isDarkMode?'Switch to light mode':'Switch to dark mode'}>
                  {isDarkMode ? <Sun size={14}/> : <Moon size={14}/>}
                  <span>Theme: {isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
                
                {/* Currency selector inside dropdown */}
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Currency
                  </div>
                  <select
                    value={state.selectedCurrencyCode}
                    onChange={(e) => dispatch({ type: 'SET_CURRENCY', payload: e.target.value })}
                    className="form-control"
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      padding: '4px 8px',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="profile-dropdown-divider" />
                <button className="profile-dropdown-item" onClick={() => { logout(); setIsProfileOpen(false); }} style={{ color:'#dc2626' }}>
                  <LogOut size={14}/> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* ── Persistent left rail nav ─────────────────────────────────────── */}
        <nav className={`left-rail${isSidebarCollapsed?' collapsed':''}`} aria-label="Module navigation">
          <div className="left-rail-nav">
            {MODULE_DEFS.map(m => {
              const allowed = !user || ROLE_RANK[user.role] >= ROLE_RANK[m.minRole];
              return (
                <button
                  key={m.id}
                  className={`left-rail-item${activeModule===m.id?' active':''}${!allowed?' disabled':''}`}
                  onClick={() => allowed && dispatch({ type:'SET_MODULE', payload:m.id })}
                  title={isSidebarCollapsed ? m.label : undefined}
                  aria-current={activeModule===m.id?'page':undefined}
                  aria-disabled={!allowed}
                  style={{ opacity:allowed?1:0.4, cursor:allowed?'pointer':'not-allowed' }}
                >
                  <span className="left-rail-icon">{m.icon}</span>
                  {!isSidebarCollapsed && (
                    <span className="left-rail-label">
                      {m.label}
                      {!allowed && <span style={{ fontSize:'0.65rem', marginLeft:'6px', color:'var(--text-muted)' }}>({m.minRole}+)</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="left-rail-footer">
            <button className="left-rail-toggle" onClick={() => dispatch({ type:'TOGGLE_SIDEBAR' })} aria-label={isSidebarCollapsed?'Expand':'Collapse'}>
              {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
            </button>
          </div>
        </nav>

        {/* ── SKU sidebar ──────────────────────────────────────────────────── */}
        <div className={`sidebar${isSkuPaneCollapsed ? ' collapsed' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>SKU Browser</span>
            <button 
              onClick={() => {
                setIsSkuPaneCollapsed(true);
                localStorage.setItem('planora_sku_pane_collapsed', 'true');
              }} 
              className="btn btn-outline" 
              style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Collapse SKU Browser"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="sidebar-search">
            <select value={selectedCategory} onChange={e => dispatch({ type:'SET_CATEGORY', payload:e.target.value })} className="form-control mb-2" style={{ fontSize:'0.8rem', padding:'0.4rem 0.5rem' }}>
              {categories.map(c => <option key={c} value={c}>{c==='All'?'All Portfolios':c}</option>)}
            </select>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:10, top:8, color:'var(--text-muted)' }} />
              <input type="text" placeholder="Search SKUs…" value={searchQuery} onChange={e => dispatch({ type:'SET_SEARCH', payload:e.target.value })} className="form-control" style={{ paddingLeft:'28px', fontSize:'0.85rem', padding:'0.4rem 2rem' }} />
            </div>
          </div>
          <div className="sidebar-content">
            <div className="nav-category">Planning Details</div>
            {filteredSkus.map(sku => (
              <button key={sku.id} onClick={() => dispatch({ type:'SET_SELECTED_SKU', payload:sku.id })} className={`sku-item${selectedSkuId===sku.id?' active':''}`}>
                <div style={{ fontSize:'0.75rem', color:'var(--text-main)', fontWeight:700, marginBottom:'2px' }}>{sku.id}</div>
                <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sku.name}</div>
                <div className="flex items-center mt-2 gap-2">
                  {sku.type?.includes('up') && <TrendingUp size={12} color="var(--status-good)" />}
                  {sku.type?.includes('down') && <TrendingUp size={12} color="var(--status-warn)" style={{ transform:'scaleY(-1)' }} />}
                  {sku.type === 'volatile' && <Activity size={12} color="var(--accent-primary)" />}
                  <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{sku.type?.replace('-',' ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main workspace ────────────────────────────────────────────────── */}
        <ErrorBoundary moduleName={activeMod?.label}>
          <div className="main-content">
            {/* SKU breadcrumb header - ERPNext style */}
            {(selectedSku || isSkuPaneCollapsed) && (
              <div style={{ padding: '1rem 2.05rem 0', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSkuPaneCollapsed && (
                    <button 
                      onClick={() => {
                        setIsSkuPaneCollapsed(false);
                        localStorage.setItem('planora_sku_pane_collapsed', 'false');
                      }}
                      className="btn btn-outline" 
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        border: 'none',
                        background: 'var(--bg-panel)',
                        boxShadow: 'var(--shadow-sm)',
                        borderRadius: '6px',
                        height: '28px',
                        cursor: 'pointer',
                        color: 'var(--text-main)'
                      }}
                      title="Expand SKU Browser"
                    >
                      <Menu size={14} /> SKUs
                    </button>
                  )}
                  {selectedSku && (
                    <ul className="desk-breadcrumb" style={{ margin: 0, padding: 0 }}>
                      <li><a href="#home">Home</a></li>
                      <li className="desk-breadcrumb-sep">/</li>
                      <li><a href={`#${activeModule}`}>{activeMod?.label}</a></li>
                      <li className="desk-breadcrumb-sep">/</li>
                      <li>{selectedSku.category}</li>
                      <li className="desk-breadcrumb-sep">/</li>
                      <li style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedSku.id}</li>
                    </ul>
                  )}
                </div>
                {selectedSku && (
                  <div className="desk-title-bar">
                    <h2 className="desk-title">{selectedSku.name}</h2>
                  </div>
                )}
              </div>
            )}

            {/* Module tabs */}
            <div className="fusion-tabs">
              {activeTabs.map(tab => {
                const tabAllowed = !(tab as any).minRole || (user && ROLE_RANK[user.role] >= ROLE_RANK[(tab as any).minRole]);
                return (
                  <div
                    key={tab.id}
                    className={`fusion-tab${activeTab===tab.id?' active':''}${!tabAllowed?' disabled':''}`}
                    onClick={() => tabAllowed && dispatch({ type:'SET_TAB', payload:tab.id })}
                    style={{ opacity:tabAllowed?1:0.4, cursor:tabAllowed?'pointer':'not-allowed' }}
                    role="tab"
                    aria-selected={activeTab===tab.id}
                  >
                    {tab.label}
                  </div>
                );
              })}
            </div>

            {/* Data Explorer tab (cross-module, lives in AppShell) */}
            {activeTab === 'data' && (
              <DataExplorer datasetVersion={selectedDataset} />
            )}

            {/* Lazy-loaded module content */}
            {activeTab !== 'data' && (
            <Suspense fallback={<DashboardSkeleton />}>
              <ActiveModule moduleId={activeModule} />
            </Suspense>
            )}
          </div>
        </ErrorBoundary>

        {/* ── AI Copilot panel ─────────────────────────────────────────────── */}
        <CopilotPanel
          isOpen={isCopilotOpen}
          onClose={() => dispatch({ type:'SET_COPILOT_OPEN', payload:false })}
          context={{
            activeModule,
            activeTab,
            selectedSku: selectedSku ? { id:selectedSku.id, name:selectedSku.name, category:selectedSku.category, base:selectedSku.base } : undefined,
            horizon,
            model: forecastModel,
            selectedDataset,
            kpiSummary: { 'SKUs': skuDatabase.length, 'Horizon':`${horizon} ${horizonUnit}s`, 'Dataset': selectedDataset || 'None' },
          }}
        />
      </div>
    </div>
  );
}
