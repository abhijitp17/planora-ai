'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { buildExportUrl, optimizeMultiEchelon, getDynamicROP, getWarehouseCapacity, optimizeSlotting } from '@/lib/api';
import { KPISkeletonRow } from '@/components/ui/Skeletons';
import { formatCurrency, CURRENCIES } from '@/types';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';
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

  const [multiEchelonData, setMultiEchelonData] = useState<any>(null);
  const [isLoadingMultiEchelon, setIsLoadingMultiEchelon] = useState(false);
  const [ropData, setRopData] = useState<Record<string, any>>({});
  const [isLoadingRop, setIsLoadingRop] = useState(false);

  // Warehouse Intelligence State
  const [warehouseCapacity, setWarehouseCapacity] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('WH_EAST');
  const [slottingData, setSlottingData] = useState<any>(null);
  const [optimizingSlotting, setOptimizingSlotting] = useState(false);

  const selectedDataset = state.selectedDataset;

  useEffect(() => {
    if (activeTab === 'warehouse') {
      getWarehouseCapacity().then((data: any) => {
        setWarehouseCapacity(data);
      }).catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'multi_echelon' && selectedDataset) {
      setIsLoadingMultiEchelon(true);
      
      const networkConfig = {
        nodes: [
          { id: 'SUPP_APAC', type: 'supplier', holding_cost: 0.05, label: 'Supplier APAC' },
          { id: 'DC_CENTRAL', type: 'dc', holding_cost: 0.10, label: 'Central DC' },
          { id: 'WH_EAST_01', type: 'warehouse', holding_cost: 0.15, label: 'Regional WH East' },
          { id: 'WH_WEST_02', type: 'warehouse', holding_cost: 0.15, label: 'Regional WH West' },
          { id: 'WH_SOUTH_03', type: 'warehouse', holding_cost: 0.15, label: 'Regional WH South' },
          { id: 'WH_NORTH_04', type: 'warehouse', holding_cost: 0.15, label: 'Regional WH North' }
        ],
        edges: [
          { from: 'SUPP_APAC', to: 'DC_CENTRAL', lead_time: 14 },
          { from: 'DC_CENTRAL', to: 'WH_EAST_01', lead_time: 7 },
          { from: 'DC_CENTRAL', to: 'WH_WEST_02', lead_time: 7 },
          { from: 'DC_CENTRAL', to: 'WH_SOUTH_03', lead_time: 10 },
          { from: 'DC_CENTRAL', to: 'WH_NORTH_04', lead_time: 10 }
        ]
      };

      optimizeMultiEchelon(selectedDataset, networkConfig, targetServiceLevel / 100)
        .then(data => {
          setMultiEchelonData(data.network_optimization);
        })
        .catch(err => console.error('Multi-echelon optimization failed:', err))
        .finally(() => setIsLoadingMultiEchelon(false));
    }
  }, [activeTab, selectedDataset, targetServiceLevel]);

  useEffect(() => {
    if (activeTab === 'replenishment' && selectedDataset && skuDatabase.length > 0) {
      setIsLoadingRop(true);
      
      const promises = skuDatabase.map(sku => 
        getDynamicROP(sku.id, selectedDataset, targetServiceLevel / 100)
          .then(data => ({ skuId: sku.id, data }))
          .catch(err => {
            console.error(`Failed to fetch ROP for SKU ${sku.id}:`, err);
            return null;
          })
      );

      Promise.all(promises).then(results => {
        const mapping: Record<string, any> = {};
        results.forEach(res => {
          if (res) {
            mapping[res.skuId] = res.data;
          }
        });
        setRopData(mapping);
      }).finally(() => setIsLoadingRop(false));
    }
  }, [activeTab, selectedDataset, targetServiceLevel, skuDatabase]);

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
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>Total Network Value (On-Hand)</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                     {formatCurrency(skuDatabase.reduce((acc, sku) => acc + (sku.onHand * sku.unitCost), 0), selectedCurrencyCode)}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Capital Invested</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>In-Transit Value</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                     {formatCurrency(skuDatabase.reduce((acc, sku) => acc + (sku.inTransit * sku.unitCost), 0), selectedCurrencyCode)}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Pipeline</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>Avg Lead Time</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>38 Days</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Across suppliers</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>At-Risk Stockouts</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>1</span>
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
                         let badgeBg = 'var(--status-good-bg)';
                         if (dos < sku.leadTime) { 
                           status = 'Stockout Risk'; 
                           color = 'var(--status-error)'; 
                           badgeBg = 'var(--status-error-bg)';
                         }
                         else if (dos > sku.leadTime * 3) { 
                           status = 'Excess (E&O)'; 
                           color = 'var(--status-warn)'; 
                           badgeBg = 'var(--accent-primary-light)';
                         }

                         return (
                           <tr key={sku.id}>
                             <td>
                               <div style={{ fontWeight: 500, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{sku.id}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.name}</div>
                             </td>
                             <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{sku.onHand.toLocaleString()}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{sku.inTransit.toLocaleString()}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(sku.unitCost, selectedCurrencyCode)}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(sku.onHand * sku.unitCost, selectedCurrencyCode)}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{avgDailyDemand.toFixed(1)}</td>
                             <td style={{ fontWeight: 500, color, fontFamily: 'var(--font-mono)' }}>{dos} Days</td>
                             <td><span className="badge" style={{ background: badgeBg, color, border: `1px solid ${color}` }}>{status}</span></td>
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
                        <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '0px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>Req. Safety Stock</div>
                          <div style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{ssUnits.toLocaleString()} <span style={{fontSize:'0.8rem'}}>u</span></div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '0px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>Capital Tied Up</div>
                          <div style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{formatCurrency(ssCapital, selectedCurrencyCode)}</div>
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
                 <div>
                   <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Dynamic Replenishment Engine</h3>
                   <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                     {isLoadingRop ? '● Computing forecast-integrated ROP/EOQ parameters...' : '● Connected to live AutoML forecast engine'}
                   </span>
                 </div>
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
                         const hasRopData = ropData && ropData[sku.id];
                         const rop = hasRopData ? Math.round(ropData[sku.id].rop) : (() => {
                           const avgDailyDemand = sku.base / 30;
                           const ltDemand = avgDailyDemand * sku.leadTime;
                           const ss = 1.65 * Math.sqrt((sku.leadTime * Math.pow(avgDailyDemand*0.2, 2)) + (Math.pow(avgDailyDemand, 2) * Math.pow(sku.leadTimeStdDev, 2)));
                           return Math.round(ltDemand + ss);
                         })();
                         const eoq = hasRopData ? Math.round(ropData[sku.id].eoq) : (() => {
                           const orderCost = 50;
                           return Math.round(Math.sqrt((2 * sku.base * 12 * orderCost) / (sku.unitCost * sku.holdingCostPct)));
                         })();
                         
                         const needsOrder = sku.onHand + sku.inTransit <= rop;

                         return (
                           <tr key={sku.id} style={{ background: needsOrder ? 'var(--accent-primary-light)' : 'transparent' }}>
                             <td style={{ fontWeight: 500, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{sku.id}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{sku.onHand.toLocaleString()}</td>
                             <td style={{ fontWeight: 500, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{rop.toLocaleString()}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{eoq.toLocaleString()}</td>
                             <td style={{ fontFamily: 'var(--font-mono)' }}>{(rop + eoq).toLocaleString()}</td>
                             <td>
                               {needsOrder 
                                  ? <span className="badge" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)', borderColor: 'var(--status-error)', border: '1px solid var(--status-error)' }}>Order Needed</span> 
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
                { label: 'A Items (80% Revenue)', value: '18', color: 'var(--status-good)', sub: 'High value, tight control' },
                { label: 'B Items (15% Revenue)', value: '24', color: 'var(--status-warn)', sub: 'Moderate control' },
                { label: 'C Items (5% Revenue)', value: 'var(--text-muted)', sub: 'Loose control' },
                { label: 'AX Sweet Spot', value: '12', color: 'var(--accent-primary)', sub: 'High value + predictable' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 500, color: kpi.color, fontFamily: 'var(--font-mono)' }}>{kpi.value}</span>
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
                        'AX': 'var(--status-good)', 'AY': 'var(--status-good)', 'AZ': 'var(--status-warn)',
                        'BX': 'var(--status-warn)', 'BY': 'var(--accent-primary)', 'BZ': 'var(--accent-primary)',
                        'CX': 'var(--text-muted)', 'CY': 'var(--text-muted)', 'CZ': 'var(--text-muted)',
                      };
                      return (
                        <tr key={sku.id}>
                          <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{sku.id}</td>
                          <td>{sku.category}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>${(sku.base * sku.asp).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{sku.cv.toFixed(2)}</td>
                          <td><span className="badge" style={{ background: abc === 'A' ? 'var(--status-good-bg)' : abc === 'B' ? 'var(--accent-primary-light)' : 'var(--bg-hover)', color: abc === 'A' ? 'var(--status-good)' : abc === 'B' ? 'var(--status-warn)' : 'var(--text-muted)', border: '1px solid var(--border-color)' }}>{abc}</span></td>
                          <td><span className="badge" style={{ background: xyz === 'X' ? 'var(--status-good-bg)' : xyz === 'Y' ? 'var(--accent-primary-light)' : 'var(--status-error-bg)', color: xyz === 'X' ? 'var(--status-good)' : xyz === 'Y' ? 'var(--status-warn)' : 'var(--status-error)', border: '1px solid var(--border-color)' }}>{xyz}</span></td>
                          <td><span className="badge" style={{ background: 'var(--bg-hover)', color: segmentColors[segment] || 'var(--text-muted)', border: `1px solid ${segmentColors[segment] || 'var(--border-color)'}`, fontWeight: 500 }}>{segment}</span></td>
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
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis 
                        type="category" 
                        dataKey="abc" 
                        domain={['C', 'B', 'A']}
                        tick={{ fontSize: 14, fontWeight: 700 }}
                        label={{ value: 'ABC (Revenue Contribution)', position: 'insideBottom', offset: -25, style: { fontSize: 12, fontWeight: 600, fill: 'var(--text-main)' } }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="xyz" 
                        domain={['Z', 'Y', 'X']}
                        tick={{ fontSize: 14, fontWeight: 700 }}
                        label={{ value: 'XYZ (Demand Variability)', angle: -90, position: 'insideLeft', offset: -30, style: { fontSize: 12, fontWeight: 600, fill: 'var(--text-main)', textAnchor: 'middle' } }}
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
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                <div className="workspace-panel shadow-sm text-center">
                  <ShieldCheck size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
                    {targetServiceLevel.toFixed(1)}% Service Level
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Adjust target service level boundary to optimize safety stock across echelons.
                  </p>
                  <div style={{ margin: '1.5rem 0' }}>
                    <input 
                      type="range" 
                      min="80" max="99.9" step="0.1" 
                      value={targetServiceLevel} 
                      onChange={(e) => dispatch({ type: 'SET_SERVICE_LEVEL', payload: Number(e.target.value) })} 
                      style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                    />
                  </div>
                  <div className="ai-panel text-left" style={{ margin: 0 }}>
                    <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', fontSize: '0.85rem' }}><Sparkles size={14} className="mr-2" color="var(--accent-primary)"/> Multi-Echelon Policy</strong>
                    <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                      Safety stock is allocated non-linearly across nodes. Increasing downstream service target exponentially raises DC and regional warehouse holding requirements due to lead-time demand variability.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', margin: 0 }}>
                    Multi-Echelon Network Graph
                  </h3>
                  <MultiEchelonFlow data={multiEchelonData} isLoading={isLoadingMultiEchelon} />
                </div>
              </div>
            </div>

            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-main)' }}>
                Multi-Echelon Safety Stock Optimization Matrix
              </h3>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Location Node</th>
                      <th>Type</th>
                      <th>Avg Demand / Day</th>
                      <th>Cumulative Lead Time</th>
                      <th>Safety Stock (Units)</th>
                      <th>Annual Holding Cost ({CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$'})</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingMultiEchelon || !multiEchelonData ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          Optimizing network safety stocks...
                        </td>
                      </tr>
                    ) : (
                      Object.entries(multiEchelonData).map(([nodeId, nodeInfo]: [string, any]) => (
                        <tr key={nodeId}>
                          <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{nodeId}</td>
                          <td style={{ textTransform: 'capitalize' }}>{nodeInfo.type}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(nodeInfo.avg_demand).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {nodeInfo.cumulative_lead_time} days
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(nodeInfo.safety_stock).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(nodeInfo.holding_cost_annual, selectedCurrencyCode)}
                          </td>
                          <td>
                            <span className="badge" style={{ 
                              background: 'var(--status-good-bg)', 
                              color: 'var(--status-good)', 
                              border: '1px solid var(--status-good)' 
                            }}>
                              Optimal
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 500, color: kpi.color, fontFamily: 'var(--font-mono)' }}>{kpi.value}</span>
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
                        <td style={{ fontWeight: 500 }}>{rec.from}</td>
                        <td style={{ fontWeight: 500 }}>{rec.to}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{rec.sku}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{rec.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>{rec.fromDos} days</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-good)', fontFamily: 'var(--font-mono)' }}>{rec.toDos} days</td>
                        <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{rec.savings}</td>
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
                { label: 'A-Grade SKUs', value: '18', color: 'var(--status-good)', sub: 'Score 80+' },
                { label: 'At-Risk SKUs', value: '6', color: 'var(--status-error)', sub: 'Score below 40' },
                { label: 'Avg DoS', value: '34 days', color: 'var(--text-main)', sub: 'Target: 30 days' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 500, color: kpi.color, fontFamily: 'var(--font-mono)' }}>{kpi.value}</span>
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
                      const gradeColor = score >= 80 ? 'var(--status-good)' : score >= 60 ? 'var(--accent-primary)' : score >= 40 ? 'var(--status-warn)' : 'var(--status-error)';
                      const gradeBg = score >= 80 ? 'var(--status-good-bg)' : score >= 60 ? 'var(--accent-primary-light)' : score >= 40 ? 'var(--accent-primary-light)' : 'var(--status-error-bg)';
                      return (
                        <tr key={sku.id}>
                          <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{sku.id}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              <div style={{ width: '60px', height: '6px', background: 'var(--bg-hover)', borderRadius: '0px', overflow: 'hidden' }}>
                                <div style={{ width: score + '%', height: '100%', background: gradeColor, borderRadius: '0px' }} />
                              </div>
                              <span style={{ fontWeight: 500, color: gradeColor, minWidth: '30px', fontFamily: 'var(--font-mono)' }}>{score}</span>
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: gradeBg, color: gradeColor, border: '1px solid ' + gradeColor, fontWeight: 500 }}>{grade}</span></td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(score * 0.85)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(score * 0.75)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(score * 0.90)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(score * 0.65)}</td>
                          <td>
                            {grade === 'D' && <span style={{ fontSize: '0.75rem', color: 'var(--status-error)', fontWeight: 500 }}>Review urgently</span>}
                            {grade === 'C' && <span style={{ fontSize: '0.75rem', color: 'var(--status-warn)', fontWeight: 500 }}>Optimize SS</span>}
                            {grade === 'B' && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Monitor</span>}
                            {grade === 'A' && <span style={{ fontSize: '0.75rem', color: 'var(--status-good)' }}>Optimal</span>}
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


        {/* WAREHOUSE INTELLIGENCE TAB */}
        {activeTab === 'warehouse' && (
          <div>
            {/* Header statistics */}
            <div className="grid grid-cols-4 mb-6">
              {[
                { label: 'Active Facilities', value: '4', color: 'var(--text-main)', sub: '1 Critical, 1 Warning' },
                { label: 'Avg Space Util', value: '73.8%', color: 'var(--accent-primary)', sub: 'Peak season target: <85%' },
                { label: 'Congested Lanes', value: 'Zone A (East)', color: 'var(--status-error)', sub: 'Active promo bottlenecks' },
                { label: 'Weekly Savings', value: '$8,450', color: 'var(--status-good)', sub: 'Via slotting runs' },
              ].map(kpi => (
                <div key={kpi.label} className="kpi-infolet">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 500, color: kpi.color, fontFamily: 'var(--font-mono)' }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Capacity Plan */}
              <div className="workspace-panel shadow-sm col-span-2">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Spatial Warehouse Capacity Plan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {warehouseCapacity ? Object.values(warehouseCapacity).map((facility: any) => {
                    const isCritical = facility.status === 'critical';
                    const isWarning = facility.status === 'warning';
                    const barColor = isCritical ? 'var(--status-error)' : isWarning ? 'var(--status-warn)' : 'var(--status-good)';
                    return (
                      <div key={facility.facility_id} style={{ border: '0.5px solid var(--border-color)', padding: '12px', background: 'var(--bg-hover)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{facility.facility_id}</span>
                            <span className="badge badge-gray" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                              {facility.total_capacity_pallets} Max Pallets
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: barColor }}>{facility.utilization_pct}% Util</span>
                            {facility.overflow_risk && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error)' }}>
                                OVERFLOW RISK
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-panel)', borderRadius: '0px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ width: `${facility.utilization_pct}%`, height: '100%', background: barColor }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>Used: {facility.used_capacity_pallets} pallets</span>
                          <span>
                            {facility.flex_lease_activated 
                              ? '⚡ Flex lease auto-activated (+2,000 pallets)' 
                              : facility.facility_id === 'WH_EAST' 
                                ? '⚠️ Spatial limits reached. Block outbound replenishment.'
                                : 'Capacity safe.'}
                          </span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading capacity plans...</div>
                  )}
                </div>
              </div>

              {/* Congestion Predictor */}
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem' }}>Zone Congestion Heatmap</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Real-time bin path telemetry at WH_EAST.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { zone: 'Zone A - Pick Line Front', speed: '0.2 m/s', status: 'Congested', color: 'var(--status-error)', cap: '92% paths blocked' },
                    { zone: 'Zone B - High Racks Center', speed: '1.1 m/s', status: 'Optimal', color: 'var(--status-good)', cap: '18% paths occupied' },
                    { zone: 'Zone C - Bulk Storage', speed: '0.9 m/s', status: 'Optimal', color: 'var(--status-good)', cap: '11% paths occupied' },
                    { zone: 'Zone D - Shipping Staging', speed: '0.4 m/s', status: 'Warning', color: 'var(--status-warn)', cap: '65% capacity' }
                  ].map(z => (
                    <div key={z.zone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-hover)', borderLeft: `3px solid ${z.color}` }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{z.zone}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Util: {z.cap}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge" style={{ fontSize: '0.65rem', border: `1px solid ${z.color}`, color: z.color, background: 'transparent' }}>{z.status}</span>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>{z.speed}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slotting Optimization */}
            <div className="workspace-panel shadow-sm mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 4px' }}>Heuristic Slotting Optimization Solver</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Re-allocate SKU storage coordinates based on picking velocity to reduce aggregate travel time.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={selectedWarehouse} 
                    onChange={e => setSelectedWarehouse(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '4px 8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}
                  >
                    <option value="WH_EAST">WH_EAST (Regional East)</option>
                    <option value="WH_WEST">WH_WEST (Regional West)</option>
                    <option value="WH_SOUTH">WH_SOUTH (Regional South)</option>
                    <option value="WH_NORTH">WH_NORTH (Regional North)</option>
                  </select>
                  <button 
                    onClick={() => {
                      setOptimizingSlotting(true);
                      optimizeSlotting(selectedWarehouse, 100).then(res => {
                        setSlottingData(res);
                        setOptimizingSlotting(false);
                      }).catch(() => setOptimizingSlotting(false));
                    }}
                    disabled={optimizingSlotting}
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                  >
                    {optimizingSlotting ? 'Running Solver...' : 'Run Slotting Optimizer'}
                  </button>
                </div>
              </div>

              {slottingData ? (
                <div>
                  {/* Results metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-4" style={{ padding: '12px', background: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Before Travel Distance</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'monospace' }}>{slottingData.before_travel_distance_meters} m</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Optimized Distance</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--status-good)' }}>{slottingData.after_travel_distance_meters} m</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance Reduction</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--status-good)' }}>-{slottingData.distance_reduction_pct}%</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operator Labor Savings</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{Math.round(slottingData.travel_time_savings_minutes)} mins / week</div>
                    </div>
                  </div>

                  {/* Recommendation table */}
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-hover)' }}>
                          <th>SKU Part Code</th>
                          <th>Picks / Day</th>
                          <th>Velocity Rank</th>
                          <th>Current Slot Zone</th>
                          <th>Recommended Slot Zone</th>
                          <th>Routing Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slottingData.recommendations.map((rec: any) => (
                          <tr key={rec.sku}>
                            <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{rec.sku}</td>
                            <td>{rec.picks_per_day}</td>
                            <td><span className="badge badge-gray">{rec.velocity}</span></td>
                            <td style={{ color: 'var(--status-error)' }}>{rec.current_bin}</td>
                            <td style={{ color: 'var(--status-good)', fontWeight: 600 }}>{rec.recommended_bin}</td>
                            <td>
                              <span style={{ color: 'var(--status-good)', fontSize: '0.75rem' }}>✓ Relocate Front</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}>
                  Click "Run Slotting Optimizer" above to run spatial layouts heuristic optimization on {selectedWarehouse}.
                </div>
              )}
            </div>

            {/* Throughput Forecasting and Labor planning */}
            <div className="grid grid-cols-2 gap-6">
              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Volatile Putaway & Pick Throughput Forecast</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={[
                      { week: 'W26', inbound: 1200, outbound: 950 },
                      { week: 'W27', inbound: 1400, outbound: 1100 },
                      { week: 'W28', inbound: 1600, outbound: 1400 },
                      { week: 'W29', inbound: 2100, outbound: 1900 },
                      { week: 'W30', inbound: 1950, outbound: 1850 },
                      { week: 'W31', inbound: 1500, outbound: 1600 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <RechartsTooltip />
                      <Legend fontSize={11} />
                      <Bar dataKey="inbound" name="Putaway (Inbound)" fill="var(--accent-primary-light)" stroke="var(--accent-primary)" />
                      <Line type="monotone" dataKey="outbound" name="Picks (Outbound)" stroke="var(--status-good)" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Labor Workforce Shift Allocation Planner</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { shift: 'Morning Picking Shift A', headcount: 14, efficiency: '98.5%', activePicks: 450, status: 'Staffed' },
                    { shift: 'Afternoon Picking Shift B', headcount: 12, efficiency: '94.2%', activePicks: 380, status: 'Staffed' },
                    { shift: 'Night Receiving Inbound Shift', headcount: 8, efficiency: '88.0%', activePicks: 610, status: 'Understaffed' },
                    { shift: 'Weekend Flex Dispatch', headcount: 6, efficiency: '91.4%', activePicks: 150, status: 'Staffed' }
                  ].map(sh => (
                    <div key={sh.shift} style={{ padding: '10px', background: 'var(--bg-hover)', border: '0.5px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{sh.shift}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Headcount: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sh.headcount} Operators</span> | Daily Pick Load: {sh.activePicks}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge" style={{ 
                          fontSize: '0.65rem', 
                          background: sh.status === 'Staffed' ? 'var(--status-good-bg)' : 'var(--status-error-bg)',
                          color: sh.status === 'Staffed' ? 'var(--status-good)' : 'var(--status-error)',
                          border: `1px solid ${sh.status === 'Staffed' ? 'var(--status-good)' : 'var(--status-error)'}`
                        }}>
                          {sh.status}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Eff: {sh.efficiency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

function MultiEchelonFlow({ data, isLoading }: { data: any, isLoading: boolean }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!data) return;

    // Define positions
    const positions: Record<string, {x: number, y: number}> = {
      'SUPP_APAC': { x: 350, y: 30 },
      'DC_CENTRAL': { x: 350, y: 190 },
      'WH_EAST_01': { x: 50, y: 370 },
      'WH_WEST_02': { x: 250, y: 370 },
      'WH_SOUTH_03': { x: 450, y: 370 },
      'WH_NORTH_04': { x: 650, y: 370 },
    };

    const colors: Record<string, string> = {
      'supplier': '#3b82f6', // Blue
      'dc': '#8b5cf6',       // Purple
      'warehouse': '#10b981', // Green
    };

    const maxSS = data ? Math.max(...Object.values(data).map((n: any) => n.safety_stock || 1)) : 1;

    const flowNodes: Node[] = Object.entries(positions).map(([nodeId, pos]) => {
      const nodeInfo = data[nodeId] || {
        safety_stock: 0,
        holding_cost_annual: 0,
        avg_demand: 0,
        cumulative_lead_time: 0,
        type: nodeId === 'SUPP_APAC' ? 'supplier' : nodeId === 'DC_CENTRAL' ? 'dc' : 'warehouse',
        label: nodeId.replace('_', ' ')
      };

      const borderCol = colors[nodeInfo.type] || '#10b981';
      const scale = data ? (0.85 + (nodeInfo.safety_stock / maxSS) * 0.3) : 1.0;

      return {
        id: nodeId,
        type: 'default',
        position: pos,
        data: {
          label: (
            <div style={{ padding: '12px', minWidth: '180px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {nodeInfo.label}
                </span>
                <span className="badge" style={{ 
                  fontSize: '0.65rem', 
                  padding: '2px 6px',
                  background: `${borderCol}20`, 
                  color: borderCol, 
                  border: `1px solid ${borderCol}` 
                }}>
                  {nodeInfo.type.toUpperCase()}
                </span>
              </div>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginTop: '6px' }}>
                <div>Avg Demand:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>
                  {Math.round(nodeInfo.avg_demand).toLocaleString()} u/d
                </div>
                
                <div>Safety Stock:</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-primary)', textAlign: 'right' }}>
                  {Math.round(nodeInfo.safety_stock).toLocaleString()} u
                </div>
                
                <div>Holding Cost:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>
                  ${Math.round(nodeInfo.holding_cost_annual).toLocaleString()}/yr
                </div>

                <div>Cumul. LT:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>
                  {nodeInfo.cumulative_lead_time} days
                </div>
              </div>
            </div>
          )
        },
        style: {
          background: 'var(--bg-panel)',
          border: `2px solid ${borderCol}`,
          borderRadius: '4px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          padding: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });

    const staticEdges = [
      { id: 'e-supp-dc', source: 'SUPP_APAC', target: 'DC_CENTRAL', lead_time: 14 },
      { id: 'e-dc-east', source: 'DC_CENTRAL', target: 'WH_EAST_01', lead_time: 7 },
      { id: 'e-dc-west', source: 'DC_CENTRAL', target: 'WH_WEST_02', lead_time: 7 },
      { id: 'e-dc-south', source: 'DC_CENTRAL', target: 'WH_SOUTH_03', lead_time: 10 },
      { id: 'e-dc-north', source: 'DC_CENTRAL', target: 'WH_NORTH_04', lead_time: 10 },
    ];

    const flowEdges: Edge[] = staticEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${e.lead_time}d Lead Time`,
      animated: true,
      style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: 'var(--text-muted)', fontWeight: 500 },
      labelBgStyle: { fill: 'var(--bg-panel)' },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data]);

  if (isLoading || !data) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--accent-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Running Clark-Scarf Network Optimization...</span>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '500px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-color)', position: 'relative' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="var(--border-color)" gap={16} />
        <Controls />
        <MiniMap nodeColor={(n: any) => {
          if (n.id === 'SUPP_APAC') return '#3b82f6';
          if (n.id === 'DC_CENTRAL') return '#8b5cf6';
          return '#10b981';
        }} />
      </ReactFlow>
    </div>
  );
}
