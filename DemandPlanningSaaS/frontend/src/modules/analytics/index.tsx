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

        </div>
    </ErrorBoundary>
  );
}
