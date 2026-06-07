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

export default function SupplyChainDiagnosticsModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon,
  } = state;

  const selectedSku = skuDatabase.find(s => s.id === selectedSkuId) ?? skuDatabase[0];

  if (!selectedSku) return <KPISkeletonRow />;

  return (
    <ErrorBoundary moduleName="Supply Chain Diagnostics">
      <div className="container">
        {/* Supply Chain Diagnostics module content */}
                  {/*      SUPPLY CHAIN DIAGNOSTICS MODULE      */}
          {/* ========================================= */}

          {/* D-TAB 1: HANDS-OFF-THE-WHEEL (HOTW) SCORE */}
          {activeTab === 'overview' && (() => {
             const avgHOTW = Math.round(skuDatabase.reduce((acc, sku) => acc + sku.overrideRate, 0) / skuDatabase.length);
             const overrideValue = Math.round((skuDatabase.filter(s => s.humMape < s.sysMape).length / skuDatabase.length) * 100);

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm text-center">
                       <Gauge size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                       <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>Global HOTW Score</h2>
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Percentage of forecasts generated purely by Machine Learning without human manual intervention.</p>
                       
                       <div style={{ position: 'relative', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <svg viewBox="0 0 100 50" style={{ width: '80%', position: 'absolute' }}>
                           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
                           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--accent-primary)" strokeWidth="10" strokeDasharray={`${125 * ((100-avgHOTW)/100)} 125`} />
                         </svg>
                         <h1 style={{ fontSize: '3rem', margin: 0, marginTop: '20px', color: 'var(--text-main)' }}>{100 - avgHOTW}%</h1>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                         <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px' }}>
                           <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Planner Override Rate</div>
                           <div style={{ fontSize: '1.25rem', color: 'var(--status-warn)', fontWeight: 300 }}>{avgHOTW}%</div>
                         </div>
                         <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px' }}>
                           <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Positive Value Add</div>
                           <div style={{ fontSize: '1.25rem', color: 'var(--status-good)', fontWeight: 300 }}>{overrideValue}%</div>
                         </div>
                       </div>
                    </div>
                 </div>

                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm" style={{ height: '100%' }}>
                     <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Forecast Value Added (FVA) Tracker</h3>
                     
                     <div className="table-container">
                       <table>
                         <thead>
                           <tr>
                             <th>SKU</th>
                             <th>ML System MAPE</th>
                             <th>Human Planner MAPE</th>
                             <th>Override Frequency</th>
                             <th>Value Add Impact</th>
                           </tr>
                         </thead>
                         <tbody>
                           {skuDatabase.map(sku => {
                             const fva = sku.sysMape - sku.humMape;
                             const fvaColor = fva > 0 ? 'var(--status-good)' : 'var(--status-error)';
                             return (
                               <tr key={sku.id}>
                                 <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</td>
                                 <td style={{ color: 'var(--text-muted)' }}>{sku.sysMape}%</td>
                                 <td style={{ color: 'var(--text-muted)' }}>{sku.humMape}%</td>
                                 <td>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                     <div style={{ width: '40px', background: 'var(--bg-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                       <div style={{ background: 'var(--text-muted)', height: '100%', width: `${sku.overrideRate}%` }} />
                                     </div>
                                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.overrideRate}%</span>
                                   </div>
                                 </td>
                                 <td style={{ color: fvaColor, fontWeight: 600 }}>
                                    {fva > 0 ? '+' : ''}{fva.toFixed(1)}% {fva > 0 ? 'Value' : 'Noise'}
                                 </td>
                               </tr>
                             )
                           })}
                         </tbody>
                       </table>
                     </div>

                     <div className="ai-panel mt-6">
                       <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> AI Process Recommendation</strong>
                       <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                         Planners are manually overriding {skuDatabase[2].id} ({skuDatabase[2].overrideRate}%) but are performing {(skuDatabase[2].humMape - skuDatabase[2].sysMape).toFixed(1)}% worse than the pure ML Baseline. Recommend locking this SKU to pure algorithmic replenishment to eliminate planner noise. 
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             );
          })()}

          {/* D-TAB 2: SUPPLY CHAIN ENTROPY SCANNER */}
          {activeTab === 'entropy' && (() => {
             const scatterData = skuDatabase.map(sku => {
                let classification = 'Smooth';
                let color = 'var(--status-good)';
                if (sku.cv < 0.5 && sku.adi < 1.32) { classification = 'Smooth'; color = 'var(--status-good)'; }
                else if (sku.cv < 0.5 && sku.adi >= 1.32) { classification = 'Intermittent'; color = 'var(--accent-primary)'; }
                else if (sku.cv >= 0.5 && sku.adi < 1.32) { classification = 'Erratic'; color = 'var(--status-warn)'; }
                else { classification = 'Lumpy'; color = 'var(--status-error)'; }
                
                return { x: sku.adi, y: sku.cv, z: sku.base, name: sku.id, class: classification, fill: color };
             });

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                       <div>
                         <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Demand Classification Quadrants</h3>
                         <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coefficient of Variation (Y) vs Average Demand Interval (X)</p>
                       </div>
                       <button className="btn btn-outline flex items-center"><Stethoscope size={14} className="mr-2"/> Scan Hierarchy</button>
                     </div>

                     <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                       {/* Quadrant Lines overlay visually */}
                       <div style={{ position: 'absolute', top: '50%', left: '10%', right: '0', borderTop: '2px dashed var(--border-color)', zIndex: 0 }} />
                       <div style={{ position: 'absolute', left: '50%', top: '5%', bottom: '15%', borderLeft: '2px dashed var(--border-color)', zIndex: 0 }} />
                       
                       <ResponsiveContainer>
                         <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                           <XAxis type="number" dataKey="x" name="ADI" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                           <YAxis type="number" dataKey="y" name="CV" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                           <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Volume" />
                           <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                           <Scatter name="SKUs" data={scatterData} fill="var(--accent-primary)" />
                         </ScatterChart>
                       </ResponsiveContainer>
                       
                       {/* Quadrant Labels */}
                       <span style={{ position: 'absolute', top: '10%', left: '15%', color: 'var(--status-warn)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>ERRATIC</span>
                       <span style={{ position: 'absolute', top: '10%', right: '10%', color: 'var(--status-error)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>LUMPY</span>
                       <span style={{ position: 'absolute', bottom: '20%', left: '15%', color: 'var(--status-good)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>SMOOTH</span>
                       <span style={{ position: 'absolute', bottom: '20%', right: '10%', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>INTERMITTENT</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm">
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Portfolio Entropy</h3>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Smooth</span>
                          <span className="badge" style={{ background: 'var(--status-good)20', color: 'var(--status-good)' }}>{scatterData.filter(d => d.class==='Smooth').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Intermittent</span>
                          <span className="badge" style={{ background: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>{scatterData.filter(d => d.class==='Intermittent').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Erratic</span>
                          <span className="badge" style={{ background: 'var(--status-warn)20', color: 'var(--status-warn)' }}>{scatterData.filter(d => d.class==='Erratic').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Lumpy</span>
                          <span className="badge" style={{ background: 'var(--status-error)20', color: 'var(--status-error)' }}>{scatterData.filter(d => d.class==='Lumpy').length} SKUs</span>
                        </div>
                      </div>
                      
                      <div className="mt-8 p-4 rounded text-center" style={{ background: 'var(--bg-hover)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Portfolio Forecastability Score</div>
                         <div style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--accent-primary)' }}>B+</div>
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highly automatable portfolio using standard ML algos.</div>
                      </div>
                    </div>
                 </div>
               </div>
             );
          })()}

          {/* ========================================= */}
      </div>
    </ErrorBoundary>
  );
}
