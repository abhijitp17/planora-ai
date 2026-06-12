'use client';
import React from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable } from '@/components/ui/DataTable';
import { getDemandAccuracyData, getServiceTrendData, STOCKOUT_EVENTS, SUPPLIER_DATA } from '@/lib/mockData';
import { buildExportUrl } from '@/lib/api';
import { KPISkeletonRow } from '@/components/ui/Skeletons';
import { formatCurrency, CURRENCIES } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar, BarChart,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import {
  TrendingUp, Package, Activity, AlertCircle, Sparkles, Database,
  Upload, ShieldCheck, ArrowRightLeft, Stethoscope, Gauge, BrainCircuit,
  DollarSign, Target, AlertTriangle, PackageMinus, CheckCircle2,
} from 'lucide-react';

export default function GlobalAnalyticsModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon, selectedCurrencyCode,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="Global Analytics">
      <div className="container">
        {/* Global Analytics module content */}
                  {/*   GLOBAL SUPPLY CHAIN ANALYTICS           */}
          {/* ========================================= */}

          {/* A-TAB 1: DEMAND ANALYTICS */}
          {activeTab === 'overview' && (() => {
             // Mock data for Forecast vs Actual over last 12 months
             const demandAccuracyData = getDemandAccuracyData();
             const avgBias = ((demandAccuracyData.reduce((a, b) => a + b.forecast, 0) / demandAccuracyData.reduce((a, b) => a + b.actual, 0)) - 1) * 100;
             const sysWmape = skuDatabase.reduce((a, b) => a + b.sysMape, 0) / skuDatabase.length;

             return (
               <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="kpi-infolet">
                      <span className="label">Forecast vs Actual WMAPE</span>
                      <span className="value">{sysWmape.toFixed(1)}%</span>
                      <span className="subtext" style={{ color: 'var(--status-good)' }}>+1.2% Improvement</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Systemic Bias (Overforecast)</span>
                      <span className="value">{avgBias > 0 ? '+' : ''}{avgBias.toFixed(1)}%</span>
                      <span className="subtext" style={{ color: avgBias > 5 || avgBias < -5 ? 'var(--status-warn)' : 'var(--text-muted)' }}>Historical 12-Month</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">High Volatility SKUs (CV &gt; 0.6)</span>
                      <span className="value">{skuDatabase.filter(s => s.cv > 0.6).length} Items</span>
                      <span className="subtext" style={{ color: 'var(--status-error)' }}>Erratic/Lumpy Profiles</span>
                    </div>
                  </div>
                  
                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Forecast vs Actual Attainment</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={demandAccuracyData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                           <YAxis stroke="var(--text-muted)" fontSize={12} />
                           <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                           <Legend />
                           <Bar dataKey="actual" name="Actual Sales" fill="var(--accent-secondary)" stroke="var(--accent-primary)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                           <Line type="monotone" dataKey="forecast" name="Consensus Forecast" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             );
          })()}

          {/* A-TAB 2: INVENTORY ANALYTICS */}
          {activeTab === 'inventory' && (() => {
             const tInventoryUnits = skuDatabase.reduce((a, s) => a + s.onHand, 0);
             const tInventoryValue = skuDatabase.reduce((a, s) => a + (s.onHand * s.unitCost), 0);
             const eoValue = skuDatabase.filter(s => s.onHand > (s.base * 3)).reduce((a, s) => a + ((s.onHand - (s.base * 2)) * s.unitCost), 0); // Mock E&O definition: > 3 months on hand
             
             // Turns = Annual COGS / Avg Inventory Value
             const annualCogs = skuDatabase.reduce((a, s) => a + (s.base * 12 * s.unitCost), 0);
             const turns = annualCogs / tInventoryValue;
             const doh = 365 / turns;

             return (
               <div>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="kpi-infolet">
                      <span className="label">Global Inventory Turns</span>
                      <span className="value">{turns.toFixed(1)}x</span>
                      <span className="subtext" style={{ color: turns >= 6 ? 'var(--status-good)' : 'var(--status-warn)' }}>Target: 6.0x</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Days of Inventory (DOH)</span>
                      <span className="value">{doh.toFixed(0)} Days</span>
                      <span className="subtext" style={{ color: 'var(--text-muted)' }}>Average Network</span>
                    </div>
                     <div className="kpi-infolet">
                       <span className="label">Excess & Obsolete (E&O)</span>
                       <span className="value">{formatCurrency(eoValue, selectedCurrencyCode, true)}</span>
                       <span className="subtext" style={{ color: 'var(--status-error)' }}>At-Risk Capital</span>
                     </div>
                    <div className="kpi-infolet">
                      <span className="label">Stockouts (Last 30D)</span>
                      <span className="value">{STOCKOUT_EVENTS} Events</span>
                      <span className="subtext" style={{ color: 'var(--status-warn)' }}>Affecting SLA</span>
                    </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Inventory Health Risk Classification</h3>
                     <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>SKU Description</th>
                              <th>Current On-Hand</th>
                              <th>Historical Turn Rate</th>
                              <th>Inventory Value</th>
                              <th style={{ textAlign: 'right' }}>Health Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skuDatabase.map(sku => {
                               const skuAnnualCogs = sku.base * 12 * sku.unitCost;
                               const skuInvVal = sku.onHand * sku.unitCost;
                               const skuTurns = skuAnnualCogs / skuInvVal;
                               let statusStr = "Healthy";
                               let color = "var(--status-good)";
                               if (skuTurns < 2) { statusStr = "Dead Stock / E&O Risk"; color = "var(--status-error)"; }
                               else if (skuTurns < 4) { statusStr = "Slow Moving"; color = "var(--status-warn)"; }
                               else if (sku.onHand < sku.base * 0.25) { statusStr = "High Stockout Risk"; color = "var(--status-error)"; }

                               return (
                                 <tr key={`ih-${sku.id}`}>
                                   <td><strong>{sku.name}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.category}</span></td>
                                   <td>{sku.onHand.toLocaleString()} Units</td>
                                   <td>{skuTurns.toFixed(1)}x</td>
                                   <td>{formatCurrency(skuInvVal, selectedCurrencyCode)}</td>
                                   <td style={{ textAlign: 'right', fontWeight: 600, color: color }}>{statusStr}</td>
                                 </tr>
                               )
                            })}
                          </tbody>
                        </table>
                     </div>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 3: SERVICE LEVEL ANALYTICS */}
          {activeTab === 'service' && (() => {
             const otifData = getServiceTrendData();

             return (
               <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="kpi-infolet" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                      <span className="label">Global OTIF (On-Time In-Full)</span>
                      <span className="value">93.4%</span>
                      <span className="subtext" style={{ color: 'var(--status-warn)' }}>Target: 96.0%</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Order Fill Rate</span>
                      <span className="value">97.8%</span>
                      <span className="subtext" style={{ color: 'var(--status-good)' }}>Target: 97.5%</span>
                    </div>
                     <div className="kpi-infolet">
                       <span className="label">Estimated Lost Sales ({CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$'})</span>
                       <span className="value">{formatCurrency(432500, selectedCurrencyCode)}</span>
                       <span className="subtext" style={{ color: 'var(--status-error)' }}>Due to shorting / backorders</span>
                     </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Service Level Trending (12 Weeks)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={otifData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} />
                           <YAxis stroke="var(--text-muted)" fontSize={12} domain={[80, 100]} />
                           <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                           <Legend />
                           <Line type="monotone" dataKey="otif" name="Global OTIF %" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} />
                           <Line type="monotone" dataKey="fillRate" name="Order Fill Rate %" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 4: SUPPLY & SUPPLIER ANALYTICS */}
          {activeTab === 'supply' && (() => {
             const suppliers = [...SUPPLIER_DATA];

             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem', margin: 0 }}>Supplier Performance Scorecard</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Analytics tracking inbound lead time variability against contractual SLAs.</p>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Supplier Vendor Group</th>
                           <th>Avg Lead Time (Days)</th>
                           <th>Lead Time Volatility (CV)</th>
                           <th>Inbound OTIF (%)</th>
                           <th>Capacity Utilization Estimate</th>
                           <th style={{ textAlign: 'right' }}>Computed Supply Risk</th>
                         </tr>
                       </thead>
                       <tbody>
                         {suppliers.map(sup => (
                           <tr key={sup.name}>
                             <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sup.name}</td>
                             <td>{sup.leadTimeAvg} Days</td>
                             <td style={{ color: sup.leadTimeVar > 10 ? 'var(--status-error)' : 'var(--text-main)' }}>±{sup.leadTimeVar} Days</td>
                             <td>
                                <div className="flex items-center gap-2">
                                  <div style={{ flex: 1, background: 'var(--bg-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${sup.otif}%`, height: '100%', background: sup.otif > 95 ? 'var(--status-good)' : sup.otif > 90 ? 'var(--status-warn)' : 'var(--status-error)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sup.otif}%</span>
                                </div>
                             </td>
                             <td>{sup.util}%</td>
                             <td style={{ textAlign: 'right', fontWeight: 700, color: sup.risk === 'High' ? 'var(--status-error)' : sup.risk === 'Medium' ? 'var(--status-warn)' : 'var(--status-good)' }}>{sup.risk}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 5: FINANCIAL ANALYTICS */}
          {activeTab === 'financial' && (() => {
             const tInventoryValue = skuDatabase.reduce((a, s) => a + (s.onHand * s.unitCost), 0);
             // Standard 20% Carrying Cost calculation based on APICS conventions (storage, capital, risk, insurance).
             const tCarryingCost = tInventoryValue * 0.20; 

             return (
               <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                     <div className="kpi-infolet" style={{ margin: 0 }}>
                       <span className="label">Working Capital Trapped (Inventory)</span>
                       <span className="value">{formatCurrency(tInventoryValue, selectedCurrencyCode, true)}</span>
                       <span className="subtext" style={{ color: 'var(--text-muted)' }}>Capital requiring liberation</span>
                     </div>
                     <div className="kpi-infolet" style={{ margin: 0 }}>
                       <span className="label">Annualized Inventory Carrying Cost (20% APICS Rate)</span>
                       <span className="value" style={{ color: 'var(--status-error)' }}>{formatCurrency(tCarryingCost, selectedCurrencyCode, true)}</span>
                       <span className="subtext">Cost of Storage, Insurance, Obsolescence & Opportunity</span>
                     </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Working Capital vs Gross Margin Map</h3>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Scatter representation of capital investment against margin yield to identify inefficient capital traps.</p>
                     <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
                            <XAxis type="number" dataKey="x" name={`Working Cap Built (${CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$'})`} unit={CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$'} stroke="var(--text-muted)" fontSize={12} />
                            <YAxis type="number" dataKey="y" name="Gross Margin Yield (%)" unit="%" stroke="var(--text-muted)" fontSize={12} />
                            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}/>
                            <Scatter name="SKUs" data={skuDatabase.map(s => {
                              const cur = CURRENCIES.find(c => c.code === selectedCurrencyCode) || CURRENCIES[0];
                              return { x: s.onHand * s.unitCost * cur.rate, y: ((s.asp - s.unitCost)/s.asp)*100, name: s.name };
                            })} fill="var(--accent-primary)" />
                        </ScatterChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 6: AI-POWERED INSIGHTS */}
          {activeTab === 'ai' && (() => {
             return (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Insight 1: Safety Stock reduction */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <BrainCircuit size={18} color="var(--accent-primary)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Inventory Optimization Opportunity</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Historical volatility for <strong>Ergonomic Office Chair</strong> has smoothed (CV dropped from 0.45 to 0.15). The current Safety Stock of robust 250 units is excessive for the new demand profile.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       💡 <span style={{ color: 'var(--text-main)' }}>AI Recommendation: </span>
                       <span style={{ color: 'var(--accent-primary)' }}>Reduce safety stock by 12% to free up $14,000 in working capital without impacting service levels.</span>
                    </div>
                 </div>

                 {/* Insight 2: Demand Spike */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--status-warn)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <TrendingUp size={18} color="var(--status-warn)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Demand Spike Anomaly Detected</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      External signals (promotional data pull) suggest a 35% spike expected next week for <strong>Wireless Gaming Mouse</strong>.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       ⚠️ <span style={{ color: 'var(--text-main)' }}>Action Required: </span>
                       <span style={{ color: 'var(--status-warn)' }}>Potential stockout in exactly 5 days. Expedite inbound PO #4992 immediately.</span>
                    </div>
                 </div>

                 {/* Insight 3: Supplier Risk */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--status-error)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <AlertTriangle size={18} color="var(--status-error)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Supplier Delay Risk Escalation</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Lead time variability for <strong>Apex Electronics Mfg</strong> has breached 3-sigma thresholds (Avg 45 days ± 14 days). This systemic delay puts the Q4 High-End Monitor components at severe risk.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       🚨 <span style={{ color: 'var(--text-main)' }}>Executive Recommendation: </span>
                       <span style={{ color: 'var(--status-error)' }}>Shift 30% of allocation to Tech Assembly Partners to de-risk Q4 Revenue target.</span>
                    </div>
                 </div>

                 {/* Insight 4: E&O Warning */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--text-muted)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <PackageMinus size={18} color="var(--text-muted)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Excess & Obsolete (E&O) Alert</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Inventory too high for SKU <strong>Desk Organizer</strong>. Current On-Hand hits 12 months of supply (1,500 units) against a declining demand curve.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       💰 <span style={{ color: 'var(--text-main)' }}>Financial Recommendation: </span>
                       <span style={{ color: 'var(--text-main)' }}>Activate 15% promotional liquidation markdown to recover capital and eliminate carrying overhead.</span>
                    </div>
                 </div>
               </div>
             );
          })()}


        {/* ═══════════════════════════════════════════════════════════════════
            PRESCRIPTIVE ACTIONS TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'prescriptive' && (
          <div>
            <div style={{ background: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <BrainCircuit size={20} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                  AI-Generated Action Recommendations
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', lineHeight: 1.6, opacity: 0.9 }}>
                  Ranked by confidence score · Automated analysis of forecasts, inventory, supplier performance, and financial metrics
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { action: 'Switch SKU_ELE_TV_85 to Croston model', confidence: 92, impact: 'Improve MAPE by 15%', category: 'Forecasting', color: '#7c3aed', details: 'High CV (0.68) indicates intermittent demand pattern better suited for Croston/SBA' },
                { action: 'Reduce safety stock for FUR_CHAIR_ERG by 12%', confidence: 88, impact: 'Free $4.2K working capital', category: 'Inventory', color: '#16a34a', details: 'Demand volatility decreased from CV 0.45 → 0.15 over last 3 months' },
                { action: 'Enable autonomous planning for 42 low-MAPE SKUs', confidence: 85, impact: 'Save 8 hours/week planner time', category: 'Automation', color: '#2563eb', details: 'SKUs with MAPE <4% can run on autopilot with monthly review' },
                { action: 'Escalate Apex Electronics lead time variance', confidence: 81, impact: 'Mitigate $180K revenue risk', category: 'Supply Chain', color: '#dc2626', details: 'LT variance breached 3-sigma (45±14 days) — Q4 monitor components at severe stockout risk' },
                { action: 'Activate promotional liquidation for ACC_ORGANIZER', confidence: 78, impact: 'Recover $12K tied capital', category: 'Financial', color: '#d97706', details: 'Excess inventory (12 months DoS) on declining demand curve — 15% markdown recommended' },
              ].map((rec, i) => (
                <div key={i} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '1rem 1.25rem', borderLeft: `4px solid ${rec.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                        {rec.action}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '8px' }}>
                        {rec.details}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className="badge" style={{ background: rec.color + '20', color: rec.color, border: `1px solid ${rec.color}` }}>
                          {rec.category}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Impact: <strong style={{ color: 'var(--text-main)' }}>{rec.impact}</strong>
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 500, color: rec.color, marginBottom: '2px' }}>
                        {rec.confidence}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Confidence
                      </div>
                      {can('edit:forecast') && (
                        <button className="btn btn-primary mt-3" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                          Execute
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            AUTONOMOUS PLANNING TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'autonomous' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'SKUs on Autopilot', value: '42', color: 'var(--accent-primary)', sub: 'Running autonomously' },
                { label: 'Planner Time Saved', value: '8 hrs/wk', color: 'var(--status-good)', sub: 'Reallocated to exceptions' },
                { label: 'Autopilot MAPE', value: '3.8%', color: 'var(--status-good)', sub: 'Better than manual' },
                { label: 'Human Overrides', value: '2.1%', color: 'var(--text-main)', sub: 'Intervention rate' },
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
                Autonomous Planning Configuration
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    MAPE Threshold for Autopilot Eligibility
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="2" max="8" step="0.5" defaultValue="5" style={{ flex: 1 }} disabled={!can('manage:settings')} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 500, minWidth: '60px' }}>5.0%</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    SKUs with MAPE below this threshold will auto-generate forecasts monthly
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Minimum History Required (Months)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="6" max="24" step="1" defaultValue="12" style={{ flex: 1 }} disabled={!can('manage:settings')} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 500, minWidth: '60px' }}>12</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    SKUs need this much historical data to qualify for autopilot
                  </p>
                </div>
              </div>

              {can('manage:settings') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary">
                    <CheckCircle2 size={14} className="mr-1" /> Enable Autonomous Planning
                  </button>
                  <button className="btn btn-outline">
                    Review Qualifying SKUs (42)
                  </button>
                </div>
              )}
            </div>

            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', fontWeight: 600 }}>
                SKUs on Autopilot
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>SKU</th><th>MAPE</th><th>Model</th><th>Last Auto-Run</th><th>Next Run</th><th>Override Rate</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {skuDatabase.slice(0, 6).map((sku, i) => (
                      <tr key={sku.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{sku.id}</td>
                        <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{sku.sysMape.toFixed(1)}%</td>
                        <td><span className="badge badge-gray">XGBoost</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2 days ago</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}>In 28 days</td>
                        <td style={{ textAlign: 'right' }}>{(sku.overrideRate * 100).toFixed(1)}%</td>
                        <td>
                          <span className="badge" style={{ background: '#eaf3de', color: '#16a34a' }}>
                            <CheckCircle2 size={10} style={{ marginRight: '3px', verticalAlign: '-1px' }} />
                            Active
                          </span>
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
