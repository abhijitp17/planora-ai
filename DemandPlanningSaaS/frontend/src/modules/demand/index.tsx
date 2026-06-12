'use client';
import React from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { BarChart as BarChartIcon, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar, BarChart,
} from 'recharts';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConsensusBulkActions } from '@/components/ui/ConsensusBulkActions';
import { autoMLForecast, batchForecast } from '@/lib/api';
import { 
  Activity, Upload, Settings, Plus, Calendar, Tag, TrendingDown, DollarSign, AlertTriangle,
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { calculateDeterministicForecast, ERROR_ANALYSIS_MODELS } from '@/lib/mockData';
import { buildExportUrl } from '@/lib/api';
import { KPISkeletonRow, ChartSkeleton } from '@/components/ui/Skeletons';

// ERROR_ANALYSIS_MODELS imported from mockData

export default function DemandModule() {
  const { state, dispatch } = usePlatform();
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false);
  const [isRunningAutoML, setIsRunningAutoML] = React.useState(false);
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, forecastModel: model,
    horizon, horizonUnit, smaWindow, emaAlpha, mlEstimators, arimaOrder,
    consensusAdjustments, apiForecastData, apiForecastMetrics, isForecastLoading,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];


  const forecastData = React.useMemo(() => {
    if (apiForecastData) return apiForecastData;
    if (!selectedSku?.history) return [];
    return calculateDeterministicForecast(selectedSku.history, model, { window: smaWindow, alpha: emaAlpha, estimators: mlEstimators, arimaOrder }, horizon, horizonUnit, consensusAdjustments, selectedSku.id);
  }, [selectedSku, model, smaWindow, emaAlpha, mlEstimators, arimaOrder, horizon, horizonUnit, consensusAdjustments, apiForecastData]);

  const handleConsensus = (period: string, value: string) => {
    const num = parseFloat(value) || 0;
    dispatch({ type: 'SET_CONSENSUS', payload: { ...consensusAdjustments, [period]: num } });
  };

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="Demand Planning">
      <div className="container">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Total System MAPE', value: '4.2%', color: 'var(--status-good)', sub: 'Outperforming baseline' },
                { label: 'Active Horizon', value: `${horizon} Mo`, color: 'var(--accent-primary)', sub: 'Rolling forward' },
                { label: 'Items in Exception', value: '12', color: 'var(--status-warn)', sub: 'Requires planner review' },
                { label: 'Consensus Delta', value: '+2.4%', color: 'var(--text-main)', sub: 'Vs Statistical Baseline' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2">
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Category Volume Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={skuDatabase}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" /><XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/><RechartsTooltip cursor={{fill:'var(--bg-hover)'}} contentStyle={{ borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-panel)', color:'var(--text-main)' }}/><Bar dataKey="base" fill="var(--accent-primary)" radius={[4,4,0,0]} barSize={40} /></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Historical Aggregate Demand</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={forecastData.filter((d: any) => d.isHistorical)}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" /><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/><RechartsTooltip contentStyle={{ borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-panel)', color:'var(--text-main)' }}/><Line type="monotone" dataKey="actual" stroke="var(--accent-primary)" strokeWidth={2} dot={false} /></LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* FORECAST EDITOR */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
              <div className="workspace-panel shadow-sm mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'8px' }}>
                    <BarChartIcon size={20} color="var(--accent-primary)" /> Statistical vs Probabilistic Forecast
                  </h3>
                  {apiForecastData && <span style={{ fontSize:'0.75rem', background:'var(--accent-primary-light)', color:'var(--accent-primary)', padding:'3px 10px', borderRadius:'4px', fontWeight:600 }}>✓ Live API Data</span>}
                </div>
                <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                  {isForecastLoading && (
                    <div className="forecast-loading"><div className="spin" /><span>Running ML forecast engine…</span></div>
                  )}
                  <ResponsiveContainer>
                    <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="period" stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <RechartsTooltip contentStyle={{ borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-panel)', color:'var(--text-main)' }} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                      <ReferenceLine x={forecastData.find((d:any) => !d.isHistorical)?.period} stroke="var(--text-main)" strokeDasharray="4 4" label={{ position:'top', value:'Today', fill:'var(--text-main)', fontSize:12 }} />
                      <Line type="step" dataKey="upperBound" stroke="var(--status-warn)" strokeDasharray="3 3" strokeWidth={1} dot={false} legendType="none" />
                      <Line type="step" dataKey="lowerBound" stroke="var(--status-warn)" strokeDasharray="3 3" strokeWidth={1} dot={false} legendType="none" />
                      <Line type="monotone" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={2} name="Actual History" dot={{ r:3 }} activeDot={{ r:6 }} connectNulls />
                      <Line type="monotone" dataKey="forecast" stroke="var(--chart-forecast)" strokeWidth={2} strokeDasharray="4 4" name="ML Baseline" dot={false} connectNulls />
                      <Line type="monotone" dataKey="consensusVolume" stroke="var(--chart-consensus)" strokeWidth={3} name="Consensus Forecast" dot={{ r:4 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Pivot grid */}
              <div className="table-container shadow-sm mb-6">
                <table>
                  <thead><tr><th className="sticky-left" style={{ minWidth:'220px' }}>Planning Metric</th>{forecastData.map((d:any,i:number) => <th key={i} style={{ textAlign:'center' }}>{d.period}</th>)}</tr></thead>
                  <tbody>
                    <tr><td className="sticky-left">Actual Historical Demand</td>{forecastData.map((d:any,i:number) => <td key={i} style={{ textAlign:'right', fontWeight:600 }}>{d.isHistorical ? d.actual?.toLocaleString() : '-'}</td>)}</tr>
                    <tr><td className="sticky-left">Statistical ML Baseline</td>{forecastData.map((d:any,i:number) => <td key={i} style={{ textAlign:'right', color:'var(--text-muted)' }}>{d.forecast?.toLocaleString()}</td>)}</tr>
                    <tr><td className="sticky-left" style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Bounds (95% CI)</td>{forecastData.map((d:any,i:number) => <td key={i} style={{ textAlign:'right', color:'var(--text-muted)', fontSize:'0.8rem' }}>{d.isHistorical ? '-' : `[${d.lowerBound} – ${d.upperBound}]`}</td>)}</tr>
                    {can('edit:consensus') && (
                      <tr style={{ background:'var(--bg-hover)' }}>
                        <td className="sticky-left" style={{ background:'var(--bg-hover)', color:'var(--accent-primary)' }}>Consensus Uplift/Down (%)</td>
                        {forecastData.map((d:any,i:number) => (
                          <td key={i} style={{ textAlign:'right', padding:'0.4rem 0.5rem' }}>
                            {d.isHistorical ? '-' : <input type="number" className="consensus-input" placeholder="0" value={consensusAdjustments[d.period] || ''} onChange={e => handleConsensus(d.period, e.target.value)} />}
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr style={{ background:'var(--accent-secondary)', borderTop:'2px solid var(--border-color)' }}>
                      <td className="sticky-left" style={{ background:'var(--accent-secondary)', fontSize:'1rem' }}>Final Forecast Volume</td>
                      {forecastData.map((d:any,i:number) => <td key={i} style={{ textAlign:'right', fontWeight:700, fontSize:'1rem', color: !d.isHistorical && consensusAdjustments[d.period] ? 'var(--accent-primary)' : 'var(--text-main)' }}>{d.isHistorical ? d.actual?.toLocaleString() : d.consensusVolume?.toLocaleString()}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Sidebar params */}
            <div style={{ gridColumn:'span 1' }}>
              <div className="workspace-panel shadow-sm sticky top-4">
                <h3 style={{ fontSize:'1rem', fontWeight:600, borderBottom:'1px solid var(--border-color)', paddingBottom:'0.75rem', marginBottom:'1rem', margin:0, color:'var(--text-main)' }}>Forecasting Parameters</h3>
                <div className="mb-4 mt-4">
                  <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Algorithm</label>
                  <select value={model} onChange={e => dispatch({ type:'SET_FORECAST_MODEL', payload:e.target.value })} className="form-control" style={{ fontSize:'0.85rem' }} disabled={!can('edit:forecast')}>
                    <optgroup label="Statistical"><option value="sma">Moving Average</option><option value="ses">Simple Exponential Smoothing</option><option value="holt">Holt (Double Exp.)</option><option value="holt-winters">Holt-Winters</option><option value="arima">ARIMA</option><option value="sarima">SARIMA</option><option value="sarimax">SARIMAX</option><option value="croston">Croston / SBA</option></optgroup>
                    <optgroup label="Machine Learning"><option value="decision-tree">Decision Tree</option><option value="random-forest">Random Forest</option><option value="xgboost">XGBoost</option><option value="lightgbm">LightGBM</option></optgroup>
                  </select>
                </div>
                <div className="mb-4">
                  <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Horizon Unit</label>
                  <div className="flex gap-2">
                    {['Day','Week','Month','Year'].map(v => <button key={v} onClick={() => dispatch({ type:'SET_HORIZON_UNIT', payload:v })} className={`btn ${horizonUnit===v?'btn-primary':'btn-outline'}`} style={{ flex:1, padding:'0.4rem', fontSize:'0.75rem' }} disabled={!can('edit:forecast')}>{v}</button>)}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)' }}>Future Periods</label>
                    <span className="badge badge-gray">{horizon} {horizonUnit}s</span>
                  </div>
                  <input type="range" min="1" max="24" value={horizon} onChange={e => dispatch({ type:'SET_HORIZON', payload:Number(e.target.value) })} style={{ width:'100%' }} disabled={!can('edit:forecast')} />
                </div>
                <div className="ai-panel">
                  <div className="flex items-center mb-2"><Sparkles size={16} color="var(--accent-primary)" className="mr-2"/><strong style={{ fontSize:'0.85rem', color:'var(--text-main)' }}>AI Recommendation</strong></div>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0, lineHeight:1.5 }}>For <strong>{selectedSku.name}</strong>, applying +15% uplift in Q4 due to historical holiday promo behaviour is recommended.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE / ERROR ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize:'1.2rem', marginBottom:'1.5rem', margin:0, color:'var(--text-main)' }}>Algorithm Performance</h3>
            {apiForecastMetrics && (
              <div style={{ background:'var(--accent-primary-light)', border:'1px solid var(--accent-primary)', borderRadius:'6px', padding:'1rem 1.25rem', marginBottom:'1.5rem', marginTop:'1rem' }}>
                <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--accent-primary)', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'6px' }}>
                  <CheckCircle2 size={14}/> Live Backtest Metrics from FastAPI Engine
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
                  {Object.entries(apiForecastMetrics).map(([name, metrics]: [string, any]) => (
                    <div key={name} style={{ background:'var(--bg-panel)', borderRadius:'6px', padding:'0.75rem', border:'1px solid var(--border-color)' }}>
                      <div style={{ fontSize:'0.7rem', textTransform:'uppercase', color:'var(--text-muted)', fontWeight:700, marginBottom:'4px' }}>{name}</div>
                      <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-main)' }}>MAPE: {typeof metrics.mape === 'number' ? metrics.mape.toFixed(1) : 'N/A'}%</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>MAE: {typeof metrics.mae === 'number' ? metrics.mae.toFixed(0) : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="table-container mt-6">
              <table>
                <thead><tr><th>Algorithm</th><th>Type</th><th>MAE</th><th>RMSE</th><th>MAPE (%)</th><th>Recommendation</th></tr></thead>
                <tbody>
                  {ERROR_ANALYSIS_MODELS.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight:600, color:'var(--accent-primary)' }}>{m.name}</td>
                      <td><span className="badge badge-gray">{m.type}</span></td>
                      <td>{m.mae}</td><td>{m.rmse}</td>
                      <td style={{ fontWeight:m.mape<5?700:400, color:m.mape<5?'var(--status-good)':'inherit' }}>{m.mape}</td>
                      <td>{m.mape<5?<span className="badge" style={{ background:'var(--status-good-bg)', color:'var(--status-good)', border:'1px solid var(--status-good)' }}>Primary Fit</span>:<span className="badge badge-gray">Discarded</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NPI */}
        {activeTab === 'npi' && (
          <div className="grid grid-cols-2">
            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize:'1.2rem', marginBottom:'1rem', margin:0, color:'var(--text-main)' }}>NPI Configuration Workspace</h3>
              <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1.5rem', marginTop:'0.5rem' }}>Simulate a forecast for a 0-history product by proxying a similar SKU profile.</p>
              <div className="mb-4"><label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Target New Product ID</label><input type="text" className="form-control" placeholder="E.g., PROD-0001-NEW" disabled={!can('edit:forecast')} /></div>
              <div className="mb-4"><label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Borrow Profile From Active SKU</label><select className="form-control" disabled={!can('edit:forecast')}>{skuDatabase.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}</select></div>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div><label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Launch Date</label><input type="date" className="form-control" disabled={!can('edit:forecast')} /></div>
                <div><label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Launch Uplift (%)</label><input type="number" className="form-control" placeholder="e.g. 25" disabled={!can('edit:forecast')} /></div>
              </div>
              <button className="btn btn-primary w-full" disabled={!can('edit:forecast')}>Generate NPI Scenario Forecast</button>
            </div>
            <div className="workspace-panel shadow-sm flex flex-col items-center justify-center text-center" style={{ border:'1px dashed var(--border-color)', background:'var(--bg-main)' }}>
              <Database size={48} color="var(--text-muted)" className="mb-4" />
              <h4 style={{ color:'var(--text-main)', fontSize:'1rem', margin:0 }}>No Scenario Active</h4>
              <p style={{ color:'var(--text-muted)', fontSize:'0.8rem', maxWidth:'300px', margin:'0.5rem auto 0' }}>Configure the NPI workspace and click Generate to see the proxy demand curve.</p>
            </div>
          </div>
        )}
        {/* ═══════════════════════════════════════════════════════════════════
            DEMAND SENSING TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sensing' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Real-Time Signals (24h)', value: '142', color: 'var(--accent-primary)', sub: 'POS + Early actuals' },
                { label: 'Forecast Adjustment', value: '+8%', color: 'var(--status-good)', sub: 'vs Statistical baseline' },
                { label: 'Signal Latency', value: '4 min', color: 'var(--text-main)', sub: 'Avg ingestion time' },
                { label: 'Coverage', value: '85%', color: 'var(--accent-primary)', sub: 'SKUs with live signals' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>
            
            <div className="workspace-panel shadow-sm mb-6">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Live Demand Signals — Last 24 Hours
              </h3>
              <div style={{ background: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)', borderRadius: '6px', padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                  Short-term forecast auto-adjusted based on early week actuals. Next update in 3h 42m.
                </span>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th><th>SKU</th><th>Channel</th><th>Actual Sales</th><th>vs Forecast</th><th>Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: '2h ago', sku: selectedSku.id, channel: 'Retail', sales: 165, forecast: 158, delta: '+4.4%', adj: 'Upward revision applied' },
                      { time: '5h ago', sku: selectedSku.id, channel: 'Online', sales: 142, forecast: 148, delta: '-4.1%', adj: 'Within tolerance' },
                      { time: '8h ago', sku: selectedSku.id, channel: 'B2B', sales: 89, forecast: 95, delta: '-6.3%', adj: 'Monitoring' },
                    ].map((sig, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{sig.time}</td>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{sig.sku}</td>
                        <td>{sig.channel}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{sig.sales.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: sig.delta.startsWith('+') ? 'var(--status-good)' : 'var(--status-warn)', fontWeight: 600 }}>{sig.delta}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sig.adj}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {can('upload:dataset') && (
                <div className="flex gap-3 mt-4">
                  <button className="btn btn-primary">
                    <Upload size={14} className="mr-1" /> Ingest Live POS Data
                  </button>
                  <button className="btn btn-outline">
                    <Settings size={14} className="mr-1" /> Configure Sensing Rules
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CAUSAL FORECASTING TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'causal' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="workspace-panel shadow-sm mb-6">
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                  ARIMAX Causal Forecast — {selectedSku.name}
                </h3>
                <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Causal forecasting incorporates <strong style={{ color: 'var(--text-main)' }}>exogenous variables</strong> (price, promotions, holidays, competitor activity) to capture external drivers of demand.
                </div>
                
                <div style={{ height: '380px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                      <RechartsTooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={2} name="Actual" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="forecast" stroke="var(--chart-forecast)" strokeWidth={2} strokeDasharray="4 4" name="Baseline (No Exog)" />
                      <Line type="monotone" dataKey="consensusVolume" stroke="#7c3aed" strokeWidth={3} name="Causal (With Exog)" dot={{ r: 4 }} />
                      <Bar dataKey="promo" fill="var(--status-warn)" opacity={0.3} name="Promo Periods" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div>
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0 }}>
                  Exogenous Variables
                </h3>
                
                {[
                  { name: 'Price (ASP)', var: 'price', icon: <DollarSign size={16} />, current: selectedSku.asp },
                  { name: 'Promotion Flag', var: 'promo', icon: <Tag size={16} />, current: 'Inactive' },
                  { name: 'Holiday Indicator', var: 'holiday', icon: <Calendar size={16} />, current: 'No upcoming' },
                  { name: 'Competitor Activity', var: 'competitor', icon: <TrendingDown size={16} />, current: 'Low' },
                ].map(exog => (
                  <div key={exog.var} style={{ marginBottom: '1rem', padding: '10px', background: 'var(--bg-hover)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {exog.icon}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{exog.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Current: <strong style={{ color: 'var(--text-main)' }}>{exog.current}</strong>
                    </div>
                    {can('edit:forecast') && (
                      <button className="btn btn-outline mt-2" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}>
                        Configure {exog.name}
                      </button>
                    )}
                  </div>
                ))}
                
                <div className="ai-panel mt-4">
                  <div className="flex items-center mb-2"><Sparkles size={14} color="var(--accent-primary)" className="mr-2" /><strong style={{ fontSize: '0.85rem' }}>Causal Insight</strong></div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Price elasticity for {selectedSku.name} is -1.8. A 10% price reduction would drive +18% volume increase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            EVENT CALENDAR TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="workspace-panel shadow-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>Event Calendar — Forecast Impact</h3>
                  {can('edit:forecast') && (
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <Plus size={14} className="mr-1" /> Add Event
                    </button>
                  )}
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Event Name</th><th>Type</th><th>Start Date</th><th>End Date</th><th>Impact</th><th>Affected</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Black Friday 2026', type: 'holiday', start: '2026-11-27', end: '2026-11-29', impact: '+45%', categories: ['Electronics', 'Furniture'], color: '#16a34a' },
                        { name: 'Q4 Clearance Sale', type: 'promotion', start: '2026-12-01', end: '2026-12-31', impact: '+25%', categories: ['All'], color: '#d97706' },
                        { name: 'New Year Holiday', type: 'holiday', start: '2027-01-01', end: '2027-01-02', impact: '-60%', categories: ['All'], color: '#dc2626' },
                        { name: 'Spring Product Launch', type: 'launch', start: '2027-03-15', end: '2027-03-15', impact: '+120%', categories: ['Electronics'], color: '#7c3aed' },
                      ].map((evt, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{evt.name}</td>
                          <td>
                            <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{evt.type}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{evt.start}</td>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{evt.end}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: evt.color }}>{evt.impact}</td>
                          <td style={{ fontSize: '0.85rem' }}>{evt.categories.join(', ')}</td>
                          <td>
                            {can('edit:forecast') && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Edit</button>
                                <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div>
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0 }}>
                  Event Impact Legend
                </h3>
                {[
                  { type: 'Holiday', icon: <Calendar size={16} />, desc: 'Major holidays, non-working days', color: '#dc2626', impact: 'Typically -40% to -80%' },
                  { type: 'Promotion', icon: <Tag size={16} />, desc: 'Sales events, discounts', color: '#d97706', impact: '+15% to +60%' },
                  { type: 'Launch', icon: <Sparkles size={16} />, desc: 'New product releases', color: '#7c3aed', impact: '+50% to +200%' },
                  { type: 'Disruption', icon: <AlertTriangle size={16} />, desc: 'Supply chain issues', color: '#dc2626', impact: '-20% to -100%' },
                ].map(item => (
                  <div key={item.type} style={{ padding: '10px', marginBottom: '8px', background: 'var(--bg-hover)', borderRadius: '6px', borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {item.icon}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.type}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '4px' }}>{item.desc}</div>
                    <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: 600 }}>Impact: {item.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            PROMOTION PLANNING TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'promo' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Active Promotions', value: '3', color: 'var(--accent-primary)', sub: 'Running now' },
                { label: 'Avg Promo Uplift', value: '+32%', color: 'var(--status-good)', sub: 'Historical avg' },
                { label: 'Promo ROI', value: '2.4x', color: 'var(--text-main)', sub: 'Revenue vs discount cost' },
                { label: 'Next Promo', value: '12 days', color: 'var(--accent-primary)', sub: 'Black Friday prep' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>
            
            <div className="workspace-panel shadow-sm mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>Promotion Calendar</h3>
                {can('edit:forecast') && (
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <Plus size={14} className="mr-1" /> Plan New Promotion
                  </button>
                )}
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Promotion Name</th><th>SKUs</th><th>Discount %</th><th>Period</th><th>Expected Uplift</th><th>Forecast Volume</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Summer Clearance', skus: '24 SKUs', discount: '20%', period: 'Jul 1-15', uplift: '+28%', volume: '3,450', status: 'Active', color: '#16a34a' },
                      { name: 'Back to School', skus: '18 SKUs', discount: '15%', period: 'Aug 1-31', uplift: '+35%', volume: '4,200', status: 'Planned', color: '#2563eb' },
                      { name: 'Black Friday', skus: 'All', discount: '30%', period: 'Nov 27-29', uplift: '+65%', volume: '12,800', status: 'Planned', color: '#2563eb' },
                    ].map((promo, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{promo.name}</td>
                        <td>{promo.skus}</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-warn)', fontWeight: 600 }}>{promo.discount}</td>
                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{promo.period}</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-good)', fontWeight: 700 }}>{promo.uplift}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{promo.volume}</td>
                        <td>
                          <span className="badge" style={{ background: promo.color + '20', color: promo.color, border: `1px solid ${promo.color}` }}>
                            {promo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Promotion Performance — Historical
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Spring Sale', uplift: 28 },
                    { name: 'Prime Day', uplift: 52 },
                    { name: 'Cyber Monday', uplift: 68 },
                    { name: 'Holiday Promo', uplift: 45 },
                  ]} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    <Bar dataKey="uplift" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SENSITIVITY ANALYSIS TAB */}
        {activeTab === 'sensitivity' && (
          <div>
            <div className="workspace-panel shadow-sm mb-6">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Parameter Sensitivity Analysis — {selectedSku.name}
              </h3>
              <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Shows how forecast accuracy changes when model parameters vary. Helps identify optimal configuration.
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Parameter</th><th>Value</th><th>MAPE</th><th>Delta vs Baseline</th><th>Forecast Avg</th></tr></thead>
                  <tbody>
                    {[
                      { param: 'n_estimators', value: 50, mape: 4.8, delta: '+0.6', avg: '1,180' },
                      { param: 'n_estimators', value: 100, mape: 4.2, delta: '0.0 (baseline)', avg: '1,220' },
                      { param: 'n_estimators', value: 200, mape: 4.0, delta: '-0.2', avg: '1,235' },
                      { param: 'max_depth', value: 3, mape: 4.5, delta: '+0.3', avg: '1,195' },
                      { param: 'max_depth', value: 5, mape: 4.2, delta: '0.0 (baseline)', avg: '1,220' },
                      { param: 'max_depth', value: 7, mape: 4.1, delta: '-0.1', avg: '1,228' },
                      { param: 'learning_rate', value: 0.01, mape: 5.1, delta: '+0.9', avg: '1,150' },
                      { param: 'learning_rate', value: 0.1, mape: 4.2, delta: '0.0 (baseline)', avg: '1,220' },
                      { param: 'learning_rate', value: 0.3, mape: 4.6, delta: '+0.4', avg: '1,242' },
                      { param: 'horizon', value: 3, mape: 3.2, delta: '-1.0', avg: '1,245' },
                      { param: 'horizon', value: 6, mape: 4.2, delta: '0.0 (baseline)', avg: '1,220' },
                      { param: 'horizon', value: 12, mape: 5.4, delta: '+1.2', avg: '1,185' },
                    ].map((row, i) => (
                      <tr key={i} style={{ background: row.delta.includes('baseline') ? 'var(--accent-primary-light)' : undefined }}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{row.param}</td>
                        <td style={{ textAlign: 'right' }}>{row.value}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: row.mape < 4.2 ? '#16a34a' : row.mape > 4.5 ? '#dc2626' : 'var(--text-main)' }}>{row.mape}%</td>
                        <td style={{ textAlign: 'right', color: row.delta.startsWith('+') ? '#dc2626' : row.delta.startsWith('-') ? '#16a34a' : 'var(--text-muted)' }}>{row.delta}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{row.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FORECAST VERSIONING TAB */}
        {activeTab === 'versions' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Saved Versions', value: '5', color: 'var(--accent-primary)', sub: 'For this SKU' },
                { label: 'Latest Version MAPE', value: '4.2%', color: 'var(--status-good)', sub: 'v5 (Jun 12)' },
                { label: 'Accuracy Trend', value: '-0.8pp', color: 'var(--status-good)', sub: 'Improving over 5 versions' },
                { label: 'Days Since Last', value: '3 days', color: 'var(--text-main)', sub: 'Auto-save enabled' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>
            <div className="workspace-panel shadow-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Forecast Version History</h3>
                {can('edit:forecast') && (
                  <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    Save Current as New Version
                  </button>
                )}
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Version</th><th>Model</th><th>MAPE</th><th>Created</th><th>Created By</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[
                      { id: 'v5', model: 'XGBoost (tuned)', mape: 4.2, date: 'Jun 12, 2026', user: 'Raj Patel' },
                      { id: 'v4', model: 'Ensemble', mape: 4.5, date: 'Jun 9, 2026', user: 'Sarah Chen' },
                      { id: 'v3', model: 'XGBoost', mape: 5.0, date: 'Jun 1, 2026', user: 'Raj Patel' },
                      { id: 'v2', model: 'ARIMA', mape: 6.2, date: 'May 15, 2026', user: 'System' },
                      { id: 'v1', model: 'Holt-Winters', mape: 6.8, date: 'May 1, 2026', user: 'System' },
                    ].map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{v.id}</td>
                        <td><span className="badge badge-gray">{v.model}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: v.mape < 5 ? '#16a34a' : '#d97706' }}>{v.mape}%</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{v.date}</td>
                        <td style={{ fontSize: '0.85rem' }}>{v.user}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Compare</button>
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Restore</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


      </div>
    </ErrorBoundary>
  );
}
