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

export default function FinancialSimulationModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="Financial Simulation">
      <div className="container">
        {/* Financial Simulation module content */}
                  {/*   FINANCIAL SIMULATION & P&L IMPACT       */}
          {/* ========================================= */}

          {/* F-TAB 1: SCENARIO SIMULATOR */}
          {activeTab === 'overview' && (() => {
             const baseVol = skuDatabase.reduce((a, s) => a + Math.min(s.base, s.supplyCapacity), 0);
             const baseRev = skuDatabase.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
             const baseCogs = skuDatabase.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
             const baseGm = baseRev - baseCogs;
             const baseGmPct = (baseGm / baseRev) * 100;

             const simVolFactor = 1 + (financeSim.volumePct / 100);
             const simPriceFactor = 1 + (financeSim.pricePct / 100);
             const simCostFactor = 1 + (financeSim.costPct / 100);
             
             // Dynamic new capacity based on user expansion override
             const simCapacityMultiplier = 1 + (financeSim.capExpPct / 100);
             const simPromoVolumeAdditive = financeSim.promoUplift > 0 ? (financeSim.promoUplift / 100) * baseVol : 0;

             const simRev = skuDatabase.reduce((a, s) => a + (Math.min(s.base * simVolFactor + (simPromoVolumeAdditive * (s.base/baseVol)), (s.supplyCapacity * simCapacityMultiplier)) * (s.asp * simPriceFactor)), 0);
             const simCogs = skuDatabase.reduce((a, s) => a + (Math.min(s.base * simVolFactor + (simPromoVolumeAdditive * (s.base/baseVol)), (s.supplyCapacity * simCapacityMultiplier)) * (s.unitCost * simCostFactor)), 0);
             const simGm = simRev - simCogs;
             const simGmPct = (simGm / simRev) * 100;

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm" style={{ height: '100%' }}>
                       <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Advanced Scenario Physics</h3>
                       
                       <div className="flex flex-col gap-5 mt-4">
                         {/* Demand Shrinkage / Growth */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Demand Volume Shock</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.volumePct > 0 ? 'var(--status-good)' : financeSim.volumePct < 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.volumePct > 0 ? '+' : ''}{financeSim.volumePct}%
                              </span>
                            </div>
                            <input type="range" min="-40" max="40" value={financeSim.volumePct} onChange={(e) => dispatch({ type: 'SET_FINANCE_SIM', payload: { volumePct: Number(e.target.value) } })} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Price Adjustment */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Price Elasticity (ASP)</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.pricePct > 0 ? 'var(--status-good)' : financeSim.pricePct < 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.pricePct > 0 ? '+' : ''}{financeSim.pricePct}%
                              </span>
                            </div>
                            <input type="range" min="-20" max="20" value={financeSim.pricePct} onChange={(e) => dispatch({ type: 'SET_FINANCE_SIM', payload: { pricePct: Number(e.target.value) } })} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Cost Fluctuations */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>COGS & Sourcing Costs</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.costPct < 0 ? 'var(--status-good)' : financeSim.costPct > 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.costPct > 0 ? '+' : ''}{financeSim.costPct}%
                              </span>
                            </div>
                            <input type="range" min="-30" max="30" value={financeSim.costPct} onChange={(e) => dispatch({ type: 'SET_FINANCE_SIM', payload: { costPct: Number(e.target.value) } })} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Promotional Uplift */}
                         <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Promotional Uplift Volume</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.promoUplift > 0 ? 'var(--status-good)' : 'var(--text-main)' }}>
                                +{financeSim.promoUplift}%
                              </span>
                            </div>
                            <input type="range" min="0" max="50" value={financeSim.promoUplift} onChange={(e) => dispatch({ type: 'SET_FINANCE_SIM', payload: { promoUplift: Number(e.target.value) } })} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Capacity Expansion */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Capacity Expansion</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.capExpPct > 0 ? 'var(--status-good)' : 'var(--text-main)' }}>
                                +{financeSim.capExpPct}% Limit
                              </span>
                            </div>
                            <input type="range" min="0" max="100" value={financeSim.capExpPct} onChange={(e) => dispatch({ type: 'SET_FINANCE_SIM', payload: { capExpPct: Number(e.target.value) } })} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>
                       </div>
                       
                       <button className="btn btn-outline w-full mt-6" onClick={() => dispatch({ type: 'SET_FINANCE_SIM', payload: {volumePct: 0, pricePct: 0, costPct: 0, promoUplift: 0, capExpPct: 0} })}>Reset Global State</button>
                    </div>
                 </div>

                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm mb-6">
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Interactive Profit & Loss Matrix</h3>
                      
                      <div className="table-container">
                         <table>
                           <thead>
                             <tr>
                               <th>Financial Line Item</th>
                               <th style={{ textAlign: 'right' }}>Operational Baseline</th>
                               <th style={{ textAlign: 'right' }}>Stress-Test Scenario</th>
                               <th style={{ textAlign: 'right' }}>Absolute Delta ($)</th>
                             </tr>
                           </thead>
                           <tbody>
                             <tr>
                               <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>Total Revenue</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${(baseRev / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>${(simRev / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simRev - baseRev) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simRev - baseRev) > 0 ? '+' : ''}{((simRev - baseRev) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr>
                               <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>Cost of Goods Sold (COGS)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${(baseCogs / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>${(simCogs / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simCogs - baseCogs) <= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simCogs - baseCogs) > 0 ? '+' : ''}{((simCogs - baseCogs) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr style={{ background: 'var(--bg-hover)' }}>
                               <td style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1em' }}>Gross Margin ($)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700 }}>${(baseGm / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1em' }}>${(simGm / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: (simGm - baseGm) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simGm - baseGm) > 0 ? '+' : ''}{((simGm - baseGm) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr>
                               <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Gross Margin (%)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{baseGmPct.toFixed(1)}%</td>
                               <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>{simGmPct.toFixed(1)}%</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simGmPct - baseGmPct) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simGmPct - baseGmPct) > 0 ? '+' : ''}{(simGmPct - baseGmPct).toFixed(1)} bps
                               </td>
                             </tr>
                           </tbody>
                         </table>
                      </div>

                      <div className="flex gap-4 mt-6">
                        <div className="kpi-infolet flex-1" style={{ margin: 0 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Scenario EBITDA Impact</span>
                          <span style={{ fontSize: '2rem', fontWeight: 300, color: (simGm - baseGm) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                            {(simGm - baseGm) > 0 ? '+' : ''}${((simGm - baseGm) / 1000).toLocaleString()}K
                          </span>
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
             );
          })()}

          {/* F-TAB 2: PRODUCT MIX OPTIMIZATION */}
          {activeTab === 'optimization' && (() => {
             // Calculate margin depth per SKU
             const optimizedSkus = [...skuDatabase].map(sku => {
                const marginDol = sku.asp - sku.unitCost;
                const marginPct = (marginDol / sku.asp) * 100;
                let recommendation = "Maintain";
                let recColor = "var(--text-muted)";
                
                if (marginPct > 60) { recommendation = "Prioritize (High Yield)"; recColor = "var(--status-good)"; }
                else if (marginPct < 30) { recommendation = "Deprioritize if Constrained"; recColor = "var(--status-error)"; }

                return { ...sku, marginDol, marginPct, recommendation, recColor };
             }).sort((a, b) => b.marginPct - a.marginPct); // Sort descending by highest yield

             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem', margin: 0 }}>Product Mix & Margin Optimization</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Algorithmic ranking of SKUs based on Gross Margin % to optimize capacity utilization during supply constraints.</p>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Product Category</th>
                           <th>Product Line</th>
                           <th>Target ASP</th>
                           <th>Unit Cost (COGS)</th>
                           <th>Gross Margin / Unit</th>
                           <th>Gross Margin (%)</th>
                           <th>Algorithm Recommendation</th>
                         </tr>
                       </thead>
                       <tbody>
                         {optimizedSkus.map(sku => (
                           <tr key={sku.id}>
                              <td style={{ color: 'var(--text-muted)' }}>{sku.category}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.name}</td>
                              <td>${sku.asp.toLocaleString()}</td>
                              <td>${sku.unitCost.toLocaleString()}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>${sku.marginDol.toLocaleString()}</td>
                              <td>
                                 <span className="badge" style={{ background: sku.marginPct > 50 ? 'var(--status-good)20' : 'var(--status-warn)20', color: sku.marginPct > 50 ? 'var(--status-good)' : 'var(--status-warn)' }}>
                                   {sku.marginPct.toFixed(1)}%
                                 </span>
                              </td>
                              <td style={{ color: sku.recColor, fontWeight: 600, fontSize: '0.8rem' }}>{sku.recommendation}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>

                  <div className="ai-panel mt-6">
                     <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> Optimization Action</strong>
                     <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                       When facing network capacity limits next month, prioritize {optimizedSkus[0].name} ({optimizedSkus[0].marginPct.toFixed(1)}% GM). Halt production routing for {optimizedSkus[optimizedSkus.length-1].name} to reallocate capacity hours to high-yield segments.
                     </p>
                  </div>
               </div>
             );
          })()}

          {/* F-TAB 3: MASTER FINANCIAL PLAN */}
          {activeTab === 'plan' && (() => {
             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Integrated Financial Plan (IFP) Ledger</h3>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Financial Division</th>
                           <th>AOP Baseline (Budget)</th>
                           <th>Unconstrained Forecast</th>
                           <th>Constrained Operational Plan</th>
                           <th>Variance to Budget ($)</th>
                         </tr>
                       </thead>
                       <tbody>
                         {/* REVENUE PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>REVENUE PLAN</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tUnc = catSkus.reduce((a, s) => a + (s.base * s.asp), 0);
                            const tCon = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
                            return (
                              <tr key={`rev-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} Revenue</td>
                                <td>${(tAop/1000).toLocaleString()}k</td>
                                <td>${(tUnc/1000).toLocaleString()}k</td>
                                <td style={{ fontWeight: 600 }}>${(tCon/1000).toLocaleString()}k</td>
                                <td style={{ color: (tCon - tAop) > 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{(tCon - tAop) > 0 ? '+' : ''}${((tCon - tAop)/1000).toLocaleString()}k</td>
                              </tr>
                            )
                         })}

                         {/* COST PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>COST PLAN (COGS)</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.unitCost), 0);
                            const tUnc = catSkus.reduce((a, s) => a + (s.base * s.unitCost), 0);
                            const tCon = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
                            return (
                              <tr key={`cost-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} COGS</td>
                                <td>${(tAop/1000).toLocaleString()}k</td>
                                <td>${(tUnc/1000).toLocaleString()}k</td>
                                <td style={{ fontWeight: 600 }}>${(tCon/1000).toLocaleString()}k</td>
                                <td>${((tCon - tAop)/1000).toLocaleString()}k</td>
                              </tr>
                            )
                         })}

                         {/* MARGIN PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>MARGIN PLAN</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAopRev = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tAopCost = catSkus.reduce((a, s) => a + (s.aopVolume * s.unitCost), 0);
                            const tAopGm = tAopRev - tAopCost;

                            const tConRev = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
                            const tConCost = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
                            const tConGm = tConRev - tConCost;
                            
                            return (
                              <tr key={`mar-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} Gross Margin ($)</td>
                                <td>${(tAopGm/1000).toLocaleString()}k</td>
                                <td style={{ color: 'var(--text-muted)' }}>-</td>
                                <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>${(tConGm/1000).toLocaleString()}k</td>
                                <td style={{ color: (tConGm - tAopGm) > 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{(tConGm - tAopGm) > 0 ? '+' : ''}${((tConGm - tAopGm)/1000).toLocaleString()}k</td>
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
