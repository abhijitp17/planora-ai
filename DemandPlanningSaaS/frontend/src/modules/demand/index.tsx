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
import { DataTable } from '@/components/ui/DataTable';
import { calculateDeterministicForecast, ERROR_ANALYSIS_MODELS } from '@/lib/mockData';
import { buildExportUrl } from '@/lib/api';
import { KPISkeletonRow, ChartSkeleton } from '@/components/ui/Skeletons';

// ERROR_ANALYSIS_MODELS imported from mockData

export default function DemandModule() {
  const { state, dispatch } = usePlatform();
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
      </div>
    </ErrorBoundary>
  );
}
