'use client';
import React from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
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

export default function InventoryOptimizationModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon, selectedCurrencyCode,
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
                     {formatCurrency(skuDatabase.reduce((acc, sku) => acc + (sku.onHand * sku.unitCost), 0), selectedCurrencyCode)}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Capital Invested</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>In-Transit Value</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>
                     {formatCurrency(skuDatabase.reduce((acc, sku) => acc + (sku.inTransit * sku.unitCost), 0), selectedCurrencyCode)}
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
                        <th>Inv. Value ({CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$'})</th>
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
                             <td>{formatCurrency(sku.unitCost, selectedCurrencyCode)}</td>
                             <td>{formatCurrency(sku.onHand * sku.unitCost, selectedCurrencyCode)}</td>
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
                         <div style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 300 }}>{formatCurrency(ssCapital, selectedCurrencyCode)}</div>
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
                         The required safety stock jumps exponentially as you approach 99.9% service level. At {targetServiceLevel.toFixed(1)}%, your safety stock is {ssUnits} units. Decreasing the Supplier Lead Time (σ) manually by negotiating better shipping consistency would save the company approx. {formatCurrency(ssCapital * 0.25, selectedCurrencyCode)} in tied-up working capital.
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

        {/* ═══════════════════════════════════════════════════════════════════
            ABC/XYZ SEGMENTATION TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'abc_xyz' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'A Items (80% Revenue)', value: '18', color: '#16a34a', sub: 'High value, tight control' },
                { label: 'B Items (15% Revenue)', value: '24', color: '#d97706', sub: 'Moderate control' },
                { label: 'C Items (5% Revenue)', value: '46', color: '#64748b', sub: 'Loose control' },
                { label: 'AX Sweet Spot', value: '12', color: 'var(--accent-primary)', sub: 'High value + predictable' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>

            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                9-Box ABC/XYZ Classification Matrix
              </h3>
              
              <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-main)' }}>ABC</strong> = Revenue contribution (Pareto 80/20) · 
                <strong style={{ color: 'var(--text-main)' }}>XYZ</strong> = Demand variability (CV thresholds)
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th><th>Category</th><th>Revenue</th><th>CV</th><th>ABC</th><th>XYZ</th><th>Segment</th><th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuDatabase.slice(0, 8).map((sku, i) => {
                      const abc = i < 2 ? 'A' : i < 5 ? 'B' : 'C';
                      const xyz = sku.cv < 0.2 ? 'X' : sku.cv < 0.5 ? 'Y' : 'Z';
                      const segment = abc + xyz;
                      const segmentColors: Record<string, string> = {
                        'AX': '#16a34a', 'AY': '#84cc16', 'AZ': '#eab308',
                        'BX': '#06b6d4', 'BY': '#3b82f6', 'BZ': '#6366f1',
                        'CX': '#64748b', 'CY': '#71717a', 'CZ': '#a1a1aa',
                      };
                      return (
                        <tr key={sku.id}>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{sku.id}</td>
                          <td>{sku.category}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${(sku.base * sku.asp).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{sku.cv.toFixed(2)}</td>
                          <td><span className="badge" style={{ background: abc === 'A' ? '#eaf3de' : abc === 'B' ? '#fef3ec' : '#f1f5f9', color: abc === 'A' ? '#16a34a' : abc === 'B' ? '#d97706' : '#64748b' }}>{abc}</span></td>
                          <td><span className="badge" style={{ background: xyz === 'X' ? '#eaf3de' : xyz === 'Y' ? '#fef3ec' : '#fef2f2', color: xyz === 'X' ? '#16a34a' : xyz === 'Y' ? '#d97706' : '#dc2626' }}>{xyz}</span></td>
                          <td><span className="badge" style={{ background: (segmentColors[segment] || '#f1f5f9') + '20', color: segmentColors[segment] || '#64748b', border: `1px solid ${segmentColors[segment] || '#64748b'}`, fontWeight: 700 }}>{segment}</span></td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {segment === 'AX' && 'Continuous review, high safety stock'}
                            {segment === 'AZ' && 'Focus forecasting effort here'}
                            {segment === 'CX' && 'Min-max reorder, low touch'}
                            {segment === 'CZ' && 'Consider SKU rationalization'}
                            {!['AX','AZ','CX','CZ'].includes(segment) && 'Standard planning approach'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              
              <div className="workspace-panel shadow-sm mt-6">
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>9-Box Heatmap Visualization</h4>
                <div style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis 
                        type="category" 
                        dataKey="abc" 
                        domain={['C', 'B', 'A']}
                        tick={{ fontSize: 14, fontWeight: 700 }}
                        label={{ value: 'ABC (Revenue Contribution)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fontWeight: 600 } }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="xyz" 
                        domain={['Z', 'Y', 'X']}
                        tick={{ fontSize: 14, fontWeight: 700 }}
                        label={{ value: 'XYZ (Demand Variability)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 600 } }}
                      />
                      <ZAxis dataKey="revenue" range={[400, 3000]} name="Revenue" />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: 12 }}
                        content={({ payload }: any) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div style={{ padding: '8px 12px' }}>
                              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{data.segment} Segment</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKUs: {data.skuCount}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Revenue: ${(data.revenue/1000).toFixed(0)}K</div>
                            </div>
                          );
                        }}
                      />
                      <Scatter 
                        data={(() => {
                          const grid: any[] = [];
                          ['A','B','C'].forEach(abc => {
                            ['X','Y','Z'].forEach(xyz => {
                              const segment = abc + xyz;
                              const skusInSegment = skuDatabase.filter((s: any) => {
                                const sAbc = s.base * s.asp > 50000 ? 'A' : s.base * s.asp > 20000 ? 'B' : 'C';
                                const sXyz = s.cv < 0.2 ? 'X' : s.cv < 0.5 ? 'Y' : 'Z';
                                return sAbc === abc && sXyz === xyz;
                              });
                              grid.push({
                                abc, xyz, segment,
                                skuCount: skusInSegment.length,
                                revenue: skusInSegment.reduce((a: number, s: any) => a + s.base * s.asp, 0),
                              });
                            });
                          });
                          return grid;
                        })()}
                      >
                        {skuDatabase.map((_: any, index: number) => {
                          const colors: Record<string, string> = {
                            'AX': '#16a34a', 'AY': '#84cc16', 'AZ': '#eab308',
                            'BX': '#06b6d4', 'BY': '#3b82f6', 'BZ': '#6366f1',
                            'CX': '#94a3b8', 'CY': '#64748b', 'CZ': '#a1a1aa',
                          };
                          return <Cell key={index} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-main)' }}>Bubble size</strong> = Total revenue · 
                  <strong style={{ color: 'var(--text-main)' }}>Color</strong> = Segment (AX=green high priority, CZ=gray low priority)
                </div>
              </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MULTI-ECHELON OPTIMIZATION TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'multi_echelon' && (
          <div>
            <div className="workspace-panel shadow-sm mb-6">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Multi-Echelon Network Safety Stock Allocation
              </h3>
              <div style={{ background: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)', borderRadius: '6px', padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <ShieldCheck size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', lineHeight: 1.6 }}>
                  Network-wide optimization allocates safety stock to minimize total holding cost while meeting 95% service level across all echelons.
                </div>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Location Node</th><th>Type</th><th>Avg Demand</th><th>Cumulative LT</th><th>Echelon SS</th><th>Holding Cost</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {[
                      { node: 'DC_CENTRAL', type: 'Central DC', demand: 1200, lt: 14, ss: 850, cost: '$2,550', status: 'Optimal' },
                      { node: 'WH_EAST_01', type: 'Regional WH', demand: 480, lt: 21, ss: 420, cost: '$1,260', status: 'Optimal' },
                      { node: 'WH_WEST_03', type: 'Regional WH', demand: 520, lt: 21, ss: 450, cost: '$1,350', status: 'Optimal' },
                      { node: 'STORE_NYC_42', type: 'Retail Store', demand: 85, lt: 28, ss: 95, cost: '$285', status: 'Review' },
                    ].map((loc, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{loc.node}</td>
                        <td>{loc.type}</td>
                        <td style={{ textAlign: 'right' }}>{loc.demand.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{loc.lt} days</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>{loc.ss.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{loc.cost}</td>
                        <td>
                          <span className="badge" style={{ background: loc.status === 'Optimal' ? '#eaf3de' : '#fef3ec', color: loc.status === 'Optimal' ? '#16a34a' : '#d97706' }}>
                            {loc.status}
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

        {/* ═══════════════════════════════════════════════════════════════════
            NETWORK BALANCING TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'balancing' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Transfer Recommendations', value: '8', color: 'var(--accent-primary)', sub: 'Active opportunities' },
                { label: 'Potential Savings', value: '$42K', color: 'var(--status-good)', sub: 'Annualized carrying cost' },
                { label: 'Network DoS Variance', value: '±18 days', color: 'var(--status-warn)', sub: 'Target: ±10 days' },
                { label: 'Balanced Locations', value: '12/20', color: 'var(--text-main)', sub: 'Within target DoS' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>

            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Network Inventory Balancing Recommendations
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>From Location</th><th>To Location</th><th>SKU</th><th>Quantity</th><th>From DoS</th><th>To DoS</th><th>Savings</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {[
                      { from: 'WH_EAST_01', to: 'WH_WEST_03', sku: selectedSku.id, qty: 450, fromDos: 52, toDos: 18, savings: '$1,350', priority: 'High' },
                      { from: 'DC_CENTRAL', to: 'STORE_NYC_42', sku: selectedSku.id, qty: 180, fromDos: 45, toDos: 12, savings: '$540', priority: 'Medium' },
                    ].map((rec, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{rec.from}</td>
                        <td style={{ fontWeight: 600 }}>{rec.to}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{rec.sku}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>{rec.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>{rec.fromDos} days</td>
                        <td style={{ textAlign: 'right', color: '#16a34a' }}>{rec.toDos} days</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{rec.savings}</td>
                        <td>
                          {can('edit:forecast') && (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                              <ArrowRightLeft size={12} className="mr-1" /> Create Transfer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


          {/* ========================================= */}

        {/* INVENTORY HEALTH SCORE TAB */}
        {activeTab === 'health' && (
          <div>
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Portfolio Health', value: '72/100', color: 'var(--accent-primary)', sub: 'Grade B — Good' },
                { label: 'A-Grade SKUs', value: '18', color: '#16a34a', sub: 'Score 80+' },
                { label: 'At-Risk SKUs', value: '6', color: '#dc2626', sub: 'Score below 40' },
                { label: 'Avg DoS', value: '34 days', color: 'var(--text-main)', sub: 'Target: 30 days' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>
            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>SKU Health Scorecard</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Composite 0-100 score: DoS (40%) + Turns (30%) + Stockout Risk (20%) + Capital Efficiency (10%)
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>SKU</th><th>Health Score</th><th>Grade</th><th>DoS Score</th><th>Turns Score</th><th>Stockout Risk</th><th>Capital Score</th><th>Action</th></tr></thead>
                  <tbody>
                    {skuDatabase.slice(0, 8).map((sku, i) => {
                      const score = 40 + Math.round(sku.cv < 0.3 ? 45 : sku.cv < 0.5 ? 30 : 15);
                      const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
                      const gradeColor = score >= 80 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626';
                      return (
                        <tr key={sku.id}>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{sku.id}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              <div style={{ width: '60px', height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: score + '%', height: '100%', background: gradeColor, borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontWeight: 700, color: gradeColor, minWidth: '30px' }}>{score}</span>
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: gradeColor + '20', color: gradeColor, border: '1px solid ' + gradeColor, fontWeight: 700 }}>{grade}</span></td>
                          <td style={{ textAlign: 'right' }}>{Math.round(score * 0.85)}</td>
                          <td style={{ textAlign: 'right' }}>{Math.round(score * 0.75)}</td>
                          <td style={{ textAlign: 'right' }}>{Math.round(score * 0.90)}</td>
                          <td style={{ textAlign: 'right' }}>{Math.round(score * 0.65)}</td>
                          <td>
                            {grade === 'D' && <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Review urgently</span>}
                            {grade === 'C' && <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Optimize SS</span>}
                            {grade === 'B' && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Monitor</span>}
                            {grade === 'A' && <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Optimal</span>}
                          </td>
                        </tr>
                      );
                    })}
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
