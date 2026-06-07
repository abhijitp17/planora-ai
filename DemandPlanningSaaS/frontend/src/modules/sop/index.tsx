'use client';
import React from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { buildExportUrl } from '@/lib/api';
import { KPISkeletonRow } from '@/components/ui/Skeletons';
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

export default function SOPIBPModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="S&OP / IBP">
      <div className="container">
        {/* S&OP / IBP module content */}
                  {/*          S&OP / IBP MODULE                */}
          {/* ========================================= */}

          {/* S-TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'overview' && (() => {
            const aopRevenue = skuDatabase.reduce((acc, sku) => acc + (sku.aopVolume * sku.asp), 0);
            const aopMargin = skuDatabase.reduce((acc, sku) => acc + (sku.aopVolume * (sku.asp - sku.unitCost)), 0);
            
            const demandRevenue = skuDatabase.reduce((acc, sku) => acc + (sku.base * sku.asp), 0);
            const constrainedSupply = skuDatabase.reduce((acc, sku) => acc + (Math.min(sku.base, sku.supplyCapacity) * sku.asp), 0);
            const supplyMargin = skuDatabase.reduce((acc, sku) => acc + (Math.min(sku.base, sku.supplyCapacity) * (sku.asp - sku.unitCost)), 0);

            const revenueShortfall = demandRevenue - constrainedSupply;
            const aopVariance = constrainedSupply - aopRevenue;
            const marginVariance = supplyMargin - aopMargin;

            return (
              <div>
                <div className="grid grid-cols-4 mb-6">
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>AOP Revenue Target (Fy26)</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>${(aopRevenue/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Annual Operating Plan</span>
                   </div>
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Constrained LE Revenue</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>${(constrainedSupply/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: aopVariance > 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                       {aopVariance > 0 ? 'Trending Above AOP' : 'Trending Below AOP'}
                     </span>
                   </div>
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Gross Margin (LE)</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>${(supplyMargin/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: marginVariance >= 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                       Var vs AOP: ${(marginVariance/1000).toFixed(1)}K
                     </span>
                   </div>
                   <div className="kpi-infolet" style={{ border: '1px solid var(--status-warn)', background: 'var(--status-warn)10' }}>
                     <span style={{ fontSize: '0.75rem', color: 'var(--status-warn)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue at Risk</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-warn)' }}>${(revenueShortfall/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--status-warn)', marginTop: '0.5rem' }}>Unconstrained Demand &gt; Supply</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Executive Portfolio Breakdown</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>SKU Category</th>
                            <th>AOP Target</th>
                            <th>Unconstrained Demand</th>
                            <th>Supply Capacity</th>
                            <th>Margin Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tDem = catSkus.reduce((a, s) => a + (s.base * s.asp), 0);
                            const tSup = catSkus.reduce((a, s) => a + (s.supplyCapacity * s.asp), 0);
                            const risk = tDem > tSup ? tDem - tSup : 0;
                            
                            return (
                              <tr key={cat}>
                                <td style={{ fontWeight: 600 }}>{cat}</td>
                                <td>${(tAop/1000).toFixed(1)}k</td>
                                <td>${(tDem/1000).toFixed(1)}k</td>
                                <td>${(tSup/1000).toFixed(1)}k</td>
                                <td style={{ color: risk > 0 ? 'var(--status-error)' : 'var(--status-good)' }}>
                                  ${(risk/1000).toFixed(1)}k
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>AOP vs Latest Estimate (LE) Performance</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Revenue', AOP: aopRevenue, ConstrainedLE: constrainedSupply },
                        { name: 'Gross Margin', AOP: aopMargin, ConstrainedLE: supplyMargin }
                      ]} barGap={10} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--text-main)', fontWeight: 600 }}/>
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val/1000}k`}/>
                        <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}/>
                        <Legend />
                        <Bar dataKey="AOP" fill="var(--text-muted)" radius={[4, 4, 0, 0]} name="AOP Budget" />
                        <Bar dataKey="ConstrainedLE" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Operational LE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* S-TAB 2: DEMAND VS SUPPLY BALANCING (RCCP) */}
          {activeTab === 'balancing' && (() => {
             // Create a time-series mock to show demand overriding capacity
             const monthlyData = [];
             let currentDem = skuDatabase.reduce((a, s) => a + s.base, 0);
             let currentCap = skuDatabase.reduce((a, s) => a + s.supplyCapacity, 0);
             
             for (let i = 0; i < 12; i++) {
               const season = Math.sin((i / 12) * Math.PI * 2) * (currentDem * 0.3); // High seasonality peak
               monthlyData.push({
                  month: `Month ${i+1}`,
                  demand: Math.round(currentDem + season),
                  capacity: currentCap
               });
             }

             return (
               <div className="grid grid-cols-4 gap-6">
                 <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
                   <div className="workspace-panel shadow-sm mb-6">
                     <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Rough-Cut Capacity Planning (Aggregate Units)</h3>
                     
                     <div style={{ height: '350px', width: '100%' }}>
                       <ResponsiveContainer>
                         <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="month" stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                           <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                           
                           <Line type="monotone" dataKey="demand" stroke="var(--accent-primary)" strokeWidth={2} dot={false} name="Unconstrained Demand" />
                           <Line type="stepAfter" dataKey="capacity" stroke="var(--status-warn)" strokeWidth={3} name="Supply Capacity Limit" dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                 </div>

                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm sticky top-4">
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0, color: 'var(--text-main)' }}>Capacity Constraints</h3>
                      
                      <div className="mb-4">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Expedite Air Freight ($50k)</label>
                        <select className="form-control" style={{ fontSize: '0.85rem' }}>
                          <option>Off</option>
                          <option>Enable for Month 3-5 Peak</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Subcontractor Capacity</label>
                        <select className="form-control" style={{ fontSize: '0.85rem' }}>
                          <option>Base Tier (Current)</option>
                          <option>Flex Tier (+15% Cap / -2% Margin)</option>
                        </select>
                      </div>
                      
                      <div className="ai-panel mt-6">
                         <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> S&OP Resolution</strong>
                         <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                           Demand exceeds Aggregate Supply Capacity by 34% during the Month 3 peak. Recommend enabling Subcontractor Flex Tier to capture the volume, sacrificing 2% margin but acquiring $180k in net revenue.
                         </p>
                      </div>
                    </div>
                 </div>
               </div>
             );
          })()}

          {/* S-TAB 3: FINANCIAL RECONCILIATION */}
          {activeTab === 'finance' && (() => {
             return (
               <div className="workspace-panel shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Financial Reconciliation P&L</h3>
                    <button className="btn btn-outline flex items-center"><DollarSign size={16} className="mr-2"/> Export Finance Board</button>
                  </div>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Product Line</th>
                           <th>Unconstrained Revenue</th>
                           <th>Constrained Revenue (LE)</th>
                           <th>AOP Target Revenue</th>
                           <th>AOP Variance</th>
                           <th>COGS Breakdown</th>
                           <th>Projected Gross Margin (%)</th>
                         </tr>
                       </thead>
                       <tbody>
                         {skuDatabase.map(sku => {
                            const unconstrainedRev = sku.base * sku.asp;
                            const constrainedRev = Math.min(sku.base, sku.supplyCapacity) * sku.asp;
                            const aopRev = sku.aopVolume * sku.asp;
                            const variance = constrainedRev - aopRev;
                            const cogs = Math.min(sku.base, sku.supplyCapacity) * sku.unitCost;
                            const gmPct = ((constrainedRev - cogs) / constrainedRev) * 100;

                            return (
                              <tr key={sku.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                   {sku.name} 
                                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.id}</div>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>${Math.round(unconstrainedRev).toLocaleString()}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>${Math.round(constrainedRev).toLocaleString()}</td>
                                <td>${Math.round(aopRev).toLocaleString()}</td>
                                <td style={{ color: variance >= 0 ? 'var(--status-good)' : 'var(--status-error)', fontWeight: 600 }}>
                                  {variance > 0 ? '+' : ''}${Math.round(variance).toLocaleString()}
                                </td>
                                <td>${Math.round(cogs).toLocaleString()}</td>
                                <td>
                                   <span className="badge" style={{ background: gmPct > 40 ? 'var(--status-good)20' : 'var(--status-warn)20', color: gmPct > 40 ? 'var(--status-good)' : 'var(--status-warn)' }}>
                                     {gmPct.toFixed(1)}%
                                   </span>
                                </td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                  </div>
               </div>
             );
          })()}

          {/* ========================================= */}
      </div>
    </ErrorBoundary>
  );
}
