'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { formatCurrency } from '@/types';
import { getPriceElasticity, simulatePrice, getPromoROI, getDynamicPricing } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Area,
} from 'recharts';
import { Tag, TrendingUp, TrendingDown, Zap, DollarSign, Percent } from 'lucide-react';

export default function PricingModule() {
  const { state } = usePlatform();
  const { can } = useAuth();
  const { activeTab, selectedDataset, selectedCurrencyCode } = state;
  const canEdit = can('edit:forecast');

  return (
    <ErrorBoundary moduleName="Pricing & Promotion">
      <div className="container">
        {activeTab === 'elasticity' && <ElasticityView dataset={selectedDataset} cur={selectedCurrencyCode} />}
        {activeTab === 'simulate' && <PriceSimulationView dataset={selectedDataset} cur={selectedCurrencyCode} canEdit={canEdit} />}
        {activeTab === 'promo' && <PromoROIView dataset={selectedDataset} cur={selectedCurrencyCode} canEdit={canEdit} />}
        {activeTab === 'dynamic' && <DynamicPricingView dataset={selectedDataset} cur={selectedCurrencyCode} />}
      </div>
    </ErrorBoundary>
  );
}

// ── Price Elasticity ──────────────────────────────────────────────────────────
function ElasticityView({ dataset, cur }: { dataset: string; cur: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    getPriceElasticity(dataset).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [dataset]);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Estimating elasticity…</div>;
  if (!data?.categories) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load elasticity.</div>;

  const cat = data.categories[selected];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Price Elasticity of Demand</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          How demand responds to price, and the profit-maximising price point along the demand curve.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {data.categories.map((c: any, i: number) => (
          <button key={c.category} onClick={() => setSelected(i)} style={{
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            border: selected === i ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: selected === i ? 'var(--accent-primary-light)' : 'var(--bg-panel)',
            color: selected === i ? 'var(--accent-primary)' : 'var(--text-main)',
          }}>{c.category}</button>
        ))}
      </div>

      <div className="grid grid-cols-4 mb-6">
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Elasticity</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-main)' }}>{cat.elasticity}</span><span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{cat.elasticity_label}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Current Price</span><span style={{ fontSize: '1.4rem', fontWeight: 300 }}>{formatCurrency(cat.base_price, cur)}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Optimal Price</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{formatCurrency(cat.optimal_price, cur)}</span><span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{cat.optimal_price_change_pct > 0 ? '+' : ''}{cat.optimal_price_change_pct}%</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Profit Uplift</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: cat.profit_uplift_pct > 0 ? 'var(--status-good)' : 'var(--text-muted)' }}>{cat.profit_uplift_pct > 0 ? '+' : ''}{cat.profit_uplift_pct}%</span></div>
      </div>

      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Profit & Revenue Curve — {cat.category}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={cat.curve} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="price_change_pct" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} formatter={(v: any) => formatCurrency(v, cur, true)} labelFormatter={(l) => `Price change: ${l > 0 ? '+' : ''}${l}%`} />
            <Legend />
            <ReferenceLine x={cat.optimal_price_change_pct} stroke="var(--accent-primary)" strokeDasharray="4 4" label={{ value: 'Optimal', fontSize: 10, fill: 'var(--accent-primary)' }} />
            <Area type="monotone" dataKey="revenue" fill="#2563eb" fillOpacity={0.1} stroke="#2563eb" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="var(--accent-primary)" strokeWidth={2.5} name="Profit" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
          {cat.elasticity_label === 'Elastic'
            ? `Demand is elastic (${cat.elasticity}) — buyers are price-sensitive, so aggressive increases erode volume faster than they lift margin.`
            : `Demand is inelastic (${cat.elasticity}) — there is room to raise price with limited volume loss, lifting profit.`}
        </p>
      </div>
    </div>
  );
}

// ── Price Simulation ──────────────────────────────────────────────────────────
function PriceSimulationView({ dataset, cur, canEdit }: { dataset: string; cur: string; canEdit: boolean }) {
  const [pct, setPct] = useState(5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    simulatePrice(dataset, pct).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [dataset, pct]);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Price Change Simulation</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Project the volume and P&L impact of a price move using category elasticity.</p>
        </div>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Price Change
          <input type="range" min="-30" max="30" step="1" value={pct} disabled={!canEdit} onChange={e => setPct(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '200px' }} />
          <span style={{ fontWeight: 600, marginLeft: '8px', color: pct >= 0 ? 'var(--status-good)' : 'var(--status-error)', minWidth: '40px', display: 'inline-block' }}>{pct > 0 ? '+' : ''}{pct}%</span>
        </label>
      </div>

      {loading || !data?.totals ? <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Simulating…</div> : (
        <>
          <div className="grid grid-cols-3 mb-6">
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue Impact</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.totals.revenue_delta >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{data.totals.revenue_delta > 0 ? '+' : ''}{formatCurrency(data.totals.revenue_delta, cur, true)}</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Profit Impact</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.totals.profit_delta >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{data.totals.profit_delta > 0 ? '+' : ''}{formatCurrency(data.totals.profit_delta, cur, true)}</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Profit Change</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.totals.profit_delta_pct >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{data.totals.profit_delta_pct > 0 ? '+' : ''}{data.totals.profit_delta_pct}%</span></div>
          </div>

          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Category Impact Detail</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Category</th><th>Base Volume</th><th>New Volume</th><th>Vol Change</th><th>New Revenue</th><th>Profit Delta</th></tr></thead>
                <tbody>
                  {data.lines.map((l: any) => (
                    <tr key={l.category}>
                      <td style={{ fontWeight: 600 }}>{l.category}</td>
                      <td style={{ textAlign: 'right' }}>{l.base_volume.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>{l.new_volume.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: l.volume_change_pct >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{l.volume_change_pct > 0 ? '+' : ''}{l.volume_change_pct}%</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(l.new_revenue, cur, true)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: l.profit_delta >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{l.profit_delta > 0 ? '+' : ''}{formatCurrency(l.profit_delta, cur, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Promotion ROI ─────────────────────────────────────────────────────────────
function PromoROIView({ dataset, cur, canEdit }: { dataset: string; cur: string; canEdit: boolean }) {
  const [discount, setDiscount] = useState(20);
  const [lift, setLift] = useState(60);
  const [weeks, setWeeks] = useState(2);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPromoROI(dataset, discount, lift, weeks).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [dataset, discount, lift, weeks]);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Promotion ROI Evaluation</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Weigh incremental margin against discount cost — accounting for forward-buying that cannibalises future sales.
        </p>
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Discount
            <input type="range" min="5" max="50" step="5" value={discount} disabled={!canEdit} onChange={e => setDiscount(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '140px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--accent-primary)' }}>{discount}%</span>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Expected Lift
            <input type="range" min="10" max="150" step="10" value={lift} disabled={!canEdit} onChange={e => setLift(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '140px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--text-main)' }}>+{lift}%</span>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Duration
            <input type="range" min="1" max="6" value={weeks} disabled={!canEdit} onChange={e => setWeeks(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '100px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--text-main)' }}>{weeks} wks</span>
          </label>
        </div>
      </div>

      {loading || !data?.totals ? <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Evaluating…</div> : (
        <>
          <div className="grid grid-cols-4 mb-6">
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Incremental Profit</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-good)' }}>{formatCurrency(data.totals.incremental_profit, cur, true)}</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Discount Cost</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-error)' }}>{formatCurrency(data.totals.discount_cost, cur, true)}</span></div>
            <div className="kpi-infolet" style={{ border: `1px solid ${data.totals.net_roi >= 0 ? 'var(--status-good)' : 'var(--status-error)'}` }}><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Net ROI</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.totals.net_roi >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{data.totals.net_roi > 0 ? '+' : ''}{formatCurrency(data.totals.net_roi, cur, true)}</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Verdict</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.totals.verdict === 'Profitable' ? 'var(--status-good)' : 'var(--status-error)' }}>{data.totals.verdict}</span><span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>ROI ratio {data.totals.roi_ratio}×</span></div>
          </div>

          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Promotion Detail by Category</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Category</th><th>Promo Price</th><th>Net Incremental Vol</th><th>Discount Cost</th><th>Incr. Profit</th><th>Net ROI</th><th>Verdict</th></tr></thead>
                <tbody>
                  {data.lines.map((l: any) => (
                    <tr key={l.category}>
                      <td style={{ fontWeight: 600 }}>{l.category}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(l.promo_price, cur)}</td>
                      <td style={{ textAlign: 'right' }}>{l.net_incremental_volume.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--status-error)' }}>{formatCurrency(l.discount_cost, cur, true)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--status-good)' }}>{formatCurrency(l.incremental_profit, cur, true)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: l.net_roi >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{l.net_roi > 0 ? '+' : ''}{formatCurrency(l.net_roi, cur, true)}</td>
                      <td><span className="badge" style={{ background: l.verdict === 'Profitable' ? 'var(--status-good)20' : 'var(--status-error)20', color: l.verdict === 'Profitable' ? 'var(--status-good)' : 'var(--status-error)' }}>{l.verdict}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Dynamic Pricing ───────────────────────────────────────────────────────────
function DynamicPricingView({ dataset, cur }: { dataset: string; cur: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDynamicPricing(dataset).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [dataset]);

  const actionColors: Record<string, string> = { Markup: 'var(--status-good)', Markdown: 'var(--status-error)', Hold: 'var(--text-muted)' };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Computing recommendations…</div>;
  if (!data?.recommendations) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load recommendations.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Dynamic Pricing Recommendations</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Real-time price moves driven by inventory cover, margin headroom, and elasticity.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {data.recommendations.map((r: any) => (
          <div key={r.category} className="workspace-panel shadow-sm" style={{ borderTop: `4px solid ${actionColors[r.action]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{r.category}</div>
              <span className="badge" style={{ background: actionColors[r.action] + '20', color: actionColors[r.action], border: `1px solid ${actionColors[r.action]}`, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {r.action === 'Markup' ? <TrendingUp size={12} /> : r.action === 'Markdown' ? <TrendingDown size={12} /> : null}
                {r.action}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-main)' }}>{formatCurrency(r.recommended_price, cur)}</span>
              {r.recommended_move_pct !== 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: actionColors[r.action] }}>{r.recommended_move_pct > 0 ? '+' : ''}{r.recommended_move_pct}%</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: r.recommended_move_pct !== 0 ? 'line-through' : 'none' }}>{formatCurrency(r.current_price, cur)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--bg-hover)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Weeks Cover</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{r.weeks_cover}</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Margin</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{r.margin_pct}%</div>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{r.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
