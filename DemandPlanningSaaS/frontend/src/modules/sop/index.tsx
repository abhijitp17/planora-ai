'use client';
import React, { useState, useEffect } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { buildExportUrl, getIBPCycleStatus, reconcileSOPPlans, compareSOPScenarios, getStrategicHorizon } from '@/lib/api';
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
  CircleCheck, CircleDashed, Clock, Users, TrendingDown, Layers, Calendar, Zap,
} from 'lucide-react';

export default function SOPIBPModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const {
    activeTab, skuDatabase, selectedSkuId, targetServiceLevel,
    financeSim, forecastModel: model, horizon, selectedCurrencyCode,
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
                      <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>{formatCurrency(aopRevenue, selectedCurrencyCode, true)}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Annual Operating Plan</span>
                    </div>
                    <div className="kpi-infolet">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Constrained LE Revenue</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{formatCurrency(constrainedSupply, selectedCurrencyCode, true)}</span>
                      <span style={{ fontSize: '0.7rem', color: aopVariance > 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                        {aopVariance > 0 ? 'Trending Above AOP' : 'Trending Below AOP'}
                      </span>
                    </div>
                    <div className="kpi-infolet">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Gross Margin (LE)</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>{formatCurrency(supplyMargin, selectedCurrencyCode, true)}</span>
                      <span style={{ fontSize: '0.7rem', color: marginVariance >= 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                        Var vs AOP: {formatCurrency(marginVariance, selectedCurrencyCode, true)}
                      </span>
                    </div>
                    <div className="kpi-infolet" style={{ border: '1px solid var(--status-warn)', background: 'var(--status-warn)10' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-warn)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue at Risk</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-warn)' }}>{formatCurrency(revenueShortfall, selectedCurrencyCode, true)}</span>
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
                                 <td>{formatCurrency(tAop, selectedCurrencyCode, true)}</td>
                                 <td>{formatCurrency(tDem, selectedCurrencyCode, true)}</td>
                                 <td>{formatCurrency(tSup, selectedCurrencyCode, true)}</td>
                                 <td style={{ color: risk > 0 ? 'var(--status-error)' : 'var(--status-good)' }}>
                                   {formatCurrency(risk, selectedCurrencyCode, true)}
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
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => formatCurrency(val, selectedCurrencyCode, true)}/>
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

          {/* S-TAB 2: DEMAND VS SUPPLY BALANCING (RCCP) — backend-connected */}
          {activeTab === 'balancing' && (
            <RCCPBalancingView
              skuDatabase={skuDatabase}
              selectedDataset={state.selectedDataset}
              selectedCurrencyCode={selectedCurrencyCode}
              canEdit={can('edit:forecast')}
            />
          )}

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
                                 <td style={{ color: 'var(--text-muted)' }}>{formatCurrency(unconstrainedRev, selectedCurrencyCode)}</td>
                                 <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(constrainedRev, selectedCurrencyCode)}</td>
                                 <td>{formatCurrency(aopRev, selectedCurrencyCode)}</td>
                                 <td style={{ color: variance >= 0 ? 'var(--status-good)' : 'var(--status-error)', fontWeight: 600 }}>
                                   {variance > 0 ? '+' : ''}{formatCurrency(variance, selectedCurrencyCode)}
                                 </td>
                                 <td>{formatCurrency(cogs, selectedCurrencyCode)}</td>
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

          {/* S-TAB 4: IBP CYCLE — the monthly 5-step process */}
          {activeTab === 'cycle' && <IBPCycleView selectedCurrencyCode={selectedCurrencyCode} selectedDataset={state.selectedDataset} />}

          {/* S-TAB 5: SCENARIO-BASED S&OP */}
          {activeTab === 'scenarios' && <ScenarioSOPView selectedCurrencyCode={selectedCurrencyCode} selectedDataset={state.selectedDataset} canEdit={can('edit:forecast')} />}

          {/* S-TAB 6: STRATEGIC PLANNING HORIZON */}
          {activeTab === 'strategic' && <StrategicHorizonView selectedCurrencyCode={selectedCurrencyCode} selectedDataset={state.selectedDataset} />}

      </div>
    </ErrorBoundary>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RCCP BALANCING VIEW — Demand vs Supply with live reconciliation levers
// ═══════════════════════════════════════════════════════════════════════════════
function RCCPBalancingView({ skuDatabase, selectedDataset, selectedCurrencyCode, canEdit }: {
  skuDatabase: any[]; selectedDataset: string; selectedCurrencyCode: string; canEdit: boolean;
}) {
  const [airFreight, setAirFreight] = useState(false);
  const [subFlex, setSubFlex] = useState(false);
  const [recon, setRecon] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reconcileSOPPlans(selectedDataset, airFreight, subFlex)
      .then(d => { setRecon(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedDataset, airFreight, subFlex]);

  // Build a 12-month seasonal curve scaled to the reconciled aggregate
  const aggDemand = recon
    ? recon.reconciliation.reduce((a: number, r: any) => a + r.demand_volume, 0)
    : skuDatabase.reduce((a, s) => a + s.base, 0);
  const aggSupply = recon
    ? recon.reconciliation.reduce((a: number, r: any) => a + r.supply_volume, 0)
    : skuDatabase.reduce((a, s) => a + s.supplyCapacity, 0);

  const monthlyData = [];
  for (let i = 0; i < 12; i++) {
    const season = Math.sin((i / 12) * Math.PI * 2) * (aggDemand * 0.3);
    monthlyData.push({
      month: `M${i + 1}`,
      demand: Math.round(aggDemand + season),
      capacity: Math.round(aggSupply),
    });
  }

  const t = recon?.totals;

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
        {/* Plan status banner */}
        {recon && (
          <div className="mb-6" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: '8px',
            background: recon.plan_status === 'BALANCED' ? 'var(--status-good)15' : 'var(--status-warn)15',
            border: `1px solid ${recon.plan_status === 'BALANCED' ? 'var(--status-good)' : 'var(--status-warn)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {recon.plan_status === 'BALANCED'
                ? <CircleCheck size={20} color="var(--status-good)" />
                : <AlertTriangle size={20} color="var(--status-warn)" />}
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                Plan Status: {recon.plan_status === 'BALANCED' ? 'Balanced' : 'Supply-Constrained'}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Capacity uplift: <strong style={{ color: 'var(--accent-primary)' }}>+{recon.levers.capacity_uplift_pct}%</strong>
              {recon.levers.margin_penalty_pct > 0 && <> · Margin cost: <strong style={{ color: 'var(--status-error)' }}>−{recon.levers.margin_penalty_pct}%</strong></>}
            </span>
          </div>
        )}

        {/* KPI strip */}
        {t && (
          <div className="grid grid-cols-4 mb-6">
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Unconstrained Demand</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-main)' }}>{formatCurrency(t.unconstrained_demand_revenue, selectedCurrencyCode, true)}</span>
            </div>
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Constrained Supply (LE)</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{formatCurrency(t.constrained_supply_revenue, selectedCurrencyCode, true)}</span>
            </div>
            <div className="kpi-infolet" style={{ border: '1px solid var(--status-warn)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--status-warn)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue at Risk</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-warn)' }}>{formatCurrency(t.revenue_at_risk, selectedCurrencyCode, true)}</span>
            </div>
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Margin Erosion</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-error)' }}>{formatCurrency(t.margin_erosion, selectedCurrencyCode, true)}</span>
            </div>
          </div>
        )}

        <div className="workspace-panel shadow-sm mb-6">
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Rough-Cut Capacity Planning (Aggregate Units)</h3>
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer>
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area type="monotone" dataKey="demand" fill="var(--accent-primary)" fillOpacity={0.12} stroke="var(--accent-primary)" strokeWidth={2} name="Unconstrained Demand" />
                <Line type="stepAfter" dataKey="capacity" stroke="var(--status-warn)" strokeWidth={3} name="Supply Capacity Limit" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-category reconciliation table */}
        {recon && (
          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Category Reconciliation — One-Number Plan</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Category</th><th>Demand</th><th>Supply</th><th>Fill Rate</th><th>Supply Revenue</th><th>Gap to AOP</th><th>Margin %</th><th>Status</th></tr></thead>
                <tbody>
                  {recon.reconciliation.map((r: any) => (
                    <tr key={r.category}>
                      <td style={{ fontWeight: 600 }}>{r.category}</td>
                      <td style={{ textAlign: 'right' }}>{Math.round(r.demand_volume).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>{Math.round(r.supply_volume).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: r.fill_rate >= 98 ? 'var(--status-good)' : r.fill_rate >= 90 ? 'var(--status-warn)' : 'var(--status-error)' }}>{r.fill_rate}%</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(r.supply_revenue, selectedCurrencyCode, true)}</td>
                      <td style={{ textAlign: 'right', color: r.gap_to_aop >= 0 ? 'var(--status-good)' : 'var(--status-error)', fontWeight: 600 }}>
                        {r.gap_to_aop > 0 ? '+' : ''}{formatCurrency(r.gap_to_aop, selectedCurrencyCode, true)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{r.margin_pct}%</td>
                      <td>
                        <span className="badge" style={{ background: r.constrained ? 'var(--status-warn)20' : 'var(--status-good)20', color: r.constrained ? 'var(--status-warn)' : 'var(--status-good)' }}>
                          {r.constrained ? 'Constrained' : 'Met'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sticky lever panel */}
      <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
        <div className="workspace-panel shadow-sm sticky top-4">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0, color: 'var(--text-main)' }}>Capacity Levers</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 1rem', lineHeight: 1.5 }}>
            Toggle levers to re-run the reconciliation engine and rebalance demand against supply in real time.
          </p>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: airFreight ? 'var(--accent-primary-light)' : 'var(--bg-hover)', borderRadius: '6px', marginBottom: '10px', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Expedite Air Freight</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+8% capacity · −1.5% margin</div>
            </div>
            <input type="checkbox" checked={airFreight} disabled={!canEdit} onChange={e => setAirFreight(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: subFlex ? 'var(--accent-primary-light)' : 'var(--bg-hover)', borderRadius: '6px', marginBottom: '1rem', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Subcontractor Flex</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+15% capacity · −2% margin</div>
            </div>
            <input type="checkbox" checked={subFlex} disabled={!canEdit} onChange={e => setSubFlex(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }} />
          </label>

          <div className="ai-panel">
            <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)" /> S&OP Resolution</strong>
            {loading ? (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recalculating plan…</p>
            ) : t ? (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {recon.plan_status === 'BALANCED'
                  ? `Plan is balanced. Constrained supply captures ${formatCurrency(t.constrained_supply_revenue, selectedCurrencyCode, true)} with only ${formatCurrency(t.revenue_at_risk, selectedCurrencyCode, true)} at risk.`
                  : `Supply gap leaves ${formatCurrency(t.revenue_at_risk, selectedCurrencyCode, true)} at risk. ${!subFlex ? 'Enable Subcontractor Flex to recover volume — ' : 'Levers active — '}margin trade-off is ${formatCurrency(t.margin_erosion, selectedCurrencyCode, true)}.`}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IBP CYCLE VIEW — Monthly 5-step Integrated Business Planning process
// ═══════════════════════════════════════════════════════════════════════════════
function IBPCycleView({ selectedCurrencyCode, selectedDataset }: { selectedCurrencyCode: string; selectedDataset: string }) {
  const [cycle, setCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIBPCycleStatus(selectedDataset).then(d => { setCycle(d); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedDataset]);

  if (loading) return <KPISkeletonRow />;
  if (!cycle) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load IBP cycle.</div>;

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    complete: { icon: CircleCheck, color: '#16a34a', label: 'Complete' },
    in_progress: { icon: Clock, color: '#d97706', label: 'In Progress' },
    pending: { icon: CircleDashed, color: '#94a3b8', label: 'Pending' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Integrated Business Planning Cycle</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {cycle.cycle_month} · Day {cycle.day_of_month} · Currently in Step {cycle.current_step}: {cycle.current_step_name}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{cycle.completion_pct}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cycle Complete</div>
        </div>
      </div>

      {/* Process flow timeline */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
        {cycle.steps.map((step: any, i: number) => {
          const cfg = statusConfig[step.status];
          const Icon = cfg.icon;
          return (
            <div key={step.step} style={{ flex: 1, position: 'relative' }}>
              <div style={{
                background: step.status === 'in_progress' ? cfg.color + '12' : 'var(--bg-panel)',
                border: `1.5px solid ${step.status === 'in_progress' ? cfg.color : 'var(--border-color)'}`,
                borderRadius: '8px', padding: '14px', height: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Icon size={18} color={cfg.color} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>Step {step.step}</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', lineHeight: 1.3 }}>{step.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{step.window}</div>
                <span className="badge" style={{ background: cfg.color + '20', color: cfg.color, fontSize: '0.68rem' }}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed step breakdown */}
      <div className="grid grid-cols-1 gap-4">
        {cycle.steps.map((step: any) => {
          const cfg = statusConfig[step.status];
          return (
            <div key={step.step} className="workspace-panel shadow-sm" style={{ borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>Step {step.step}: {step.name}</span>
                    <span className="badge" style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={13} /> {step.owner} · <Calendar size={13} /> {step.window}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '12px', lineHeight: 1.5 }}>{step.purpose}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Inputs</div>
                  {step.inputs.map((inp: string, j: number) => (
                    <div key={j} style={{ fontSize: '0.8rem', color: 'var(--text-main)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowRightLeft size={11} color="var(--text-muted)" /> {inp}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Outputs</div>
                  {step.outputs.map((out: string, j: number) => (
                    <div key={j} style={{ fontSize: '0.8rem', color: 'var(--text-main)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={11} color={cfg.color} /> {out}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO-BASED S&OP — Compare strategic scenarios
// ═══════════════════════════════════════════════════════════════════════════════
function ScenarioSOPView({ selectedCurrencyCode, selectedDataset, canEdit }: { selectedCurrencyCode: string; selectedDataset: string; canEdit: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    compareSOPScenarios(selectedDataset).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedDataset]);

  if (loading) return <KPISkeletonRow />;
  if (!data?.scenarios) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load scenarios.</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Scenario-Based S&OP</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Evaluate strategic alternatives before committing to the consensus plan. Each scenario models different demand, capacity, and margin assumptions.
        </p>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {data.scenarios.map((s: any) => (
          <div key={s.scenario} className="workspace-panel shadow-sm" style={{ border: s.recommended ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.scenario}</span>
                {s.recommended && <span className="badge" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', marginLeft: '8px', fontSize: '0.68rem' }}>RECOMMENDED</span>}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.revenue_vs_base >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                {s.revenue_vs_base > 0 ? '+' : ''}{s.revenue_vs_base}%
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5, minHeight: '36px' }}>{s.narrative}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Revenue', value: formatCurrency(s.revenue, selectedCurrencyCode, true) },
                { label: 'Margin %', value: `${s.margin_pct}%` },
                { label: 'Service', value: `${s.service_level}%` },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg-hover)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '3px' }}>{m.label}</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Scenario Comparison — Revenue vs Margin</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.scenarios} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="scenario" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, 100]} />
            <RechartsTooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="var(--accent-primary)" radius={[4,4,0,0]} name="Revenue" />
            <Bar yAxisId="left" dataKey="margin" fill="#7c3aed" radius={[4,4,0,0]} name="Margin" />
            <Line yAxisId="right" type="monotone" dataKey="service_level" stroke="#d97706" strokeWidth={2} name="Service Level %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGIC PLANNING HORIZON — Multi-year rolling view
// ═══════════════════════════════════════════════════════════════════════════════
function StrategicHorizonView({ selectedCurrencyCode, selectedDataset }: { selectedCurrencyCode: string; selectedDataset: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState(3);

  useEffect(() => {
    getStrategicHorizon(selectedDataset, years).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedDataset, years]);

  if (loading) return <KPISkeletonRow />;
  if (!data?.horizon) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load strategic horizon.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Strategic Planning Horizon</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Rolling {years}-year strategic IBP view · Net growth {data.net_annual_growth}/yr
          </p>
        </div>
        <select className="form-control" style={{ width: '140px', fontSize: '0.85rem' }} value={years} onChange={e => setYears(Number(e.target.value))}>
          <option value={2}>2 Years</option>
          <option value={3}>3 Years</option>
          <option value={5}>5 Years</option>
        </select>
      </div>

      {/* Growth assumptions */}
      <div className="grid grid-cols-4 mb-6">
        {Object.entries(data.growth_assumptions).map(([k, v]: any) => (
          <div key={k} className="kpi-infolet">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 700, marginBottom: '0.5rem' }}>{k.replace('_', ' ')}</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 300, color: v.startsWith('-') ? 'var(--status-error)' : 'var(--status-good)' }}>{v}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>annual contribution</span>
          </div>
        ))}
      </div>

      {/* Revenue trajectory chart */}
      <div className="workspace-panel shadow-sm mb-6">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Revenue & Capacity Trajectory</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.horizon} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <RechartsTooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} formatter={(v: any) => formatCurrency(v, selectedCurrencyCode, true)} />
            <Legend />
            <Area type="monotone" dataKey="revenue_plan" fill="var(--accent-primary)" fillOpacity={0.15} stroke="var(--accent-primary)" strokeWidth={2} name="Revenue Plan" />
            <Line type="stepAfter" dataKey="capacity_required" stroke="var(--status-warn)" strokeWidth={2} strokeDasharray="5 5" name="Capacity Required" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Strategic initiatives */}
      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Strategic Initiatives & Capacity Investments</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Initiative</th><th>Target Year</th><th>Investment</th><th>ROI Horizon</th><th>Status</th></tr></thead>
            <tbody>
              {data.strategic_initiatives.map((init: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{init.initiative}</td>
                  <td>Year {init.year}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(init.investment, selectedCurrencyCode, true)}</td>
                  <td>{init.roi_months} months</td>
                  <td><span className="badge" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>Planned</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ai-panel mt-4">
          <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> Strategic Insight</strong>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Revenue grows from {formatCurrency(data.base_annual_revenue, selectedCurrencyCode, true)} to {formatCurrency(data.terminal_revenue, selectedCurrencyCode, true)} over the horizon. Capacity expansion in Year 2 is the critical path — without it, the plan caps out at ~85% fill rate by Y2 Q3.
          </p>
        </div>
      </div>
    </div>
  );
}
