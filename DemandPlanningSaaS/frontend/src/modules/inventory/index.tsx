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

export default function InventoryOptimizationModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="Inventory Optimization">
      <div className="container">
        {/* Inventory Optimization module content */}
                  {/* ========================================= */}
          {/*        INVENTORY OPTIMIZATION MODULE      */}
          {/* ========================================= */}
          
          {/* I-TAB 1: NETWORK DASHBOARD */}
          {activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-4 mb-6">
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Total Network Value (On-Hand)</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>
                     ${skuDatabase.reduce((acc, sku) => acc + (sku.onHand * sku.unitCost), 0).toLocaleString()}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Capital Invested</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>In-Transit Value</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>
                     ${skuDatabase.reduce((acc, sku) => acc + (sku.inTransit * sku.unitCost), 0).toLocaleString()}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Pipeline</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Avg Lead Time</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>38 Days</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Across suppliers</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>At-Risk Stockouts</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-error)' }}>1</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Requires expedite</span>
                 </div>
              </div>

              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Multi-Echelon Network View</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU Hierarchy</th>
                        <th>On-Hand Qty</th>
                        <th>In-Transit Qty</th>
                        <th>Unit Cost</th>
                        <th>Inv. Value ($)</th>
                        <th>Avg Demand / Day</th>
                        <th>Days of Supply (DoS)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuDatabase.map(sku => {
                         const avgDailyDemand = sku.base / 30;
                         const dos = Math.round(sku.onHand / avgDailyDemand);
                         let status = 'Healthy'; let color = 'var(--status-good)';
                         if (dos < sku.leadTime) { status = 'Stockout Risk'; color = 'var(--status-error)'; }
                         else if (dos > sku.leadTime * 3) { status = 'Excess (E&O)'; color = 'var(--status-warn)'; }

                         return (
                           <tr key={sku.id}>
                             <td>
                               <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.name}</div>
                             </td>
                             <td style={{ fontWeight: 600 }}>{sku.onHand.toLocaleString()}</td>
                             <td>{sku.inTransit.toLocaleString()}</td>
                             <td>${sku.unitCost.toFixed(2)}</td>
                             <td>${Math.round(sku.onHand * sku.unitCost).toLocaleString()}</td>
                             <td>{avgDailyDemand.toFixed(1)}</td>
                             <td style={{ fontWeight: 600, color }}>{dos} Days</td>
                             <td><span className="badge" style={{ background: color + '20', color, border: `1px solid ${color}` }}>{status}</span></td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* I-TAB 2: SAFETY STOCK SIMULATOR */}
          {activeTab === 'safety_stock' && (() => {
             // Z-Scores for pure normal dist service levels
             const zScores = { 80: 0.84, 85: 1.04, 90: 1.28, 95: 1.65, 98: 2.05, 99: 2.33, 99.9: 3.09 };
             const closestZ = Object.entries(zScores).reduce((prev, curr) => Math.abs(Number(curr[0]) - targetServiceLevel) < Math.abs(Number(prev[0]) - targetServiceLevel) ? curr : prev);
             const z = closestZ[1];
             
             // Daily Demand StdDev mapped roughly from type
             const d_stddev = selectedSku.base * (selectedSku.type === 'volatile' ? 0.4 : 0.15) / 30;
             const avgDailyDemand = selectedSku.base / 30;
             
             // Calculate Safety Stock (SS = Z * sqrt((LT * sigma_d^2) + (D_avg^2 * sigma_LT^2)))
             const lt_variance = selectedSku.leadTime * Math.pow(d_stddev, 2);
             const demand_variance = Math.pow(avgDailyDemand, 2) * Math.pow(selectedSku.leadTimeStdDev, 2);
             const ssUnits = Math.round(z * Math.sqrt(lt_variance + demand_variance));
             const ssCapital = ssUnits * selectedSku.unitCost;
             
             return (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                  <div className="workspace-panel shadow-sm text-center mb-6">
                     <ShieldCheck size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                     <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>{targetServiceLevel.toFixed(1)}% Target Service Level</h2>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Adjust slider to recalculate stock boundaries based on Amazon flow algorithms.</p>
                     
                     <div style={{ margin: '2rem 0' }}>
                        <input 
                          type="range" 
                          min="80" max="99.9" step="0.1" 
                          value={targetServiceLevel} 
                          onChange={(e) => dispatch({ type: 'SET_SERVICE_LEVEL', payload: Number(e.target.value) })} 
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 text-left">
                       <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Req. Safety Stock</div>
                         <div style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', fontWeight: 300 }}>{ssUnits.toLocaleString()} <span style={{fontSize:'0.8rem'}}>u</span></div>
                       </div>
                       <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Capital Tied Up</div>
                         <div style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 300 }}>${Math.round(ssCapital).toLocaleString()}</div>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Multi-Echelon Parameters ({selectedSku.id})</h3>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div style={{ borderLeft: '4px solid var(--border-color)', paddingLeft: '1rem' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Supply Volatility</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                           <span>Average Lead Time:</span> <strong style={{color:'var(--text-main)'}}>{selectedSku.leadTime} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                           <span>Lead Time StdDev (σ):</span> <strong style={{color:'var(--text-main)'}}>{selectedSku.leadTimeStdDev} Days</strong>
                        </div>
                      </div>
                      
                      <div style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Demand Volatility</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                           <span>Avg Daily Demand:</span> <strong style={{color:'var(--text-main)'}}>{avgDailyDemand.toFixed(1)} u/day</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                           <span>Demand StdDev (σ):</span> <strong style={{color:'var(--text-main)'}}>{d_stddev.toFixed(1)} u/day</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ai-panel">
                       <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><Sparkles size={16} className="mr-2" color="var(--accent-primary)"/> AI Inventory Insight</strong>
                       <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                         The required safety stock jumps exponentially as you approach 99.9% service level. At {targetServiceLevel.toFixed(1)}%, your safety stock is {ssUnits} units. Decreasing the Supplier Lead Time (σ) manually by negotiating better shipping consistency would save the company approx. ${(ssCapital * 0.25).toLocaleString()} in tied-up working capital.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
             );
          })()}

          {/* I-TAB 3: REPLENISHMENT WORKBENCH */}
          {activeTab === 'replenishment' && (
            <div className="workspace-panel shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Dynamic Replenishment Engine</h3>
                 <button className="btn btn-primary flex items-center"><ArrowRightLeft size={16} className="mr-2"/> Generate POs</button>
               </div>
               
               <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>On-Hand</th>
                        <th>Reorder Point (ROP)</th>
                        <th>Economic Order Qty (EOQ)</th>
                        <th>Max Level</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuDatabase.map(sku => {
                         const avgDailyDemand = sku.base / 30;
                         const ltDemand = avgDailyDemand * sku.leadTime;
                         const ss = 1.65 * Math.sqrt((sku.leadTime * Math.pow(avgDailyDemand*0.2, 2)) + (Math.pow(avgDailyDemand, 2) * Math.pow(sku.leadTimeStdDev, 2)));
                         const rop = Math.round(ltDemand + ss);
                         const orderCost = 50;
                         const eoq = Math.round(Math.sqrt((2 * sku.base * 12 * orderCost) / (sku.unitCost * sku.holdingCostPct)));
                         
                         const needsOrder = sku.onHand + sku.inTransit <= rop;

                         return (
                           <tr key={sku.id} style={{ background: needsOrder ? 'var(--status-warn)20' : 'transparent' }}>
                             <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</td>
                             <td>{sku.onHand.toLocaleString()}</td>
                             <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rop.toLocaleString()}</td>
                             <td>{eoq.toLocaleString()}</td>
                             <td>{(rop + eoq).toLocaleString()}</td>
                             <td>
                               {needsOrder 
                                  ? <span className="badge" style={{ background: 'var(--status-error)', color: 'white' }}>Order Needed</span> 
                                  : <span className="badge badge-gray">Sufficient</span>}
                             </td>
                             <td>
                               {needsOrder ? <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>Create PO: {eoq}u</button> : '-'}
                             </td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* ========================================= */}
      </div>
    </ErrorBoundary>
  );
}
