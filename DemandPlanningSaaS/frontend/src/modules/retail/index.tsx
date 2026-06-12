'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import type { RetailCategory, PlanogramSpace } from '@/types';
import { Store, Tag, Package, BarChart2, Maximize, AlertCircle, TrendingUp, TrendingDown, Layers, MapPin, Zap, DollarSign, Activity, Download } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { getCategoryRoles } from '@/lib/api';
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis, Cell } from 'recharts';

export default function RetailModule() {
  const { state } = usePlatform();
  const { can } = useAuth();
  const { activeTab, skuDatabase } = state;
  
  // Build categories from real SKU data
  const [categories, setCategories] = useState<RetailCategory[]>([]);
  const [planogramSpaces, setPlanogramSpaces] = useState<PlanogramSpace[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (categories.length === 0 && skuDatabase.length > 0) {
      // Aggregate by category
      const catMap: Record<string, any> = {};
      skuDatabase.forEach(sku => {
        if (!catMap[sku.category]) {
          catMap[sku.category] = { skus: [], revenue: 0, margin: 0 };
        }
        catMap[sku.category].skus.push(sku);
        catMap[sku.category].revenue += sku.base * sku.asp;
        catMap[sku.category].margin += sku.asp > sku.unitCost ? ((sku.asp - sku.unitCost) / sku.asp) * 100 : 0;
      });
      
      const cats: RetailCategory[] = Object.entries(catMap).map(([name, data]) => ({
        id: `cat-${name.toLowerCase().replace(/\s/g, '-')}`,
        name,
        department: 'General Merchandise',
        revenue: Math.round(data.revenue),
        margin: Math.round(data.margin / data.skus.length),
        skus: data.skus.length,
        growthPct: Math.round((Math.random() - 0.3) * 20 * 10) / 10,
      }));
      
      setCategories(cats);
      
      // Mock planogram
      const totalSpace = 1000;
      const spaces: PlanogramSpace[] = cats.map((c, i) => {
        const spaceShare = (c.revenue / cats.reduce((a,x)=>a+x.revenue,0)) * 100;
        const salesShare = spaceShare + (Math.random() - 0.5) * 20;
        return {
          categoryId: c.id,
          linearFeet: Math.round((spaceShare / 100) * totalSpace),
          facings: Math.round((spaceShare / 100) * totalSpace * 5),
          spaceSharePct: Math.round(spaceShare * 10) / 10,
          salesSharePct: Math.round(salesShare * 10) / 10,
        };
      });
      setPlanogramSpaces(spaces);
    }
  }, [skuDatabase, categories.length]);

  const optimizeSpace = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch('http://localhost:8000/api/retail/space-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categories.map((c, i) => ({
            id: c.id,
            revenue: c.revenue,
            margin: c.margin,
            current_linear_feet: planogramSpaces[i]?.linearFeet || 100,
          })),
          total_space: 1000,
          constraints: { min_per_category: 20, max_per_category: 400 },
        }),
      });
      const data = await res.json();
      
      // Update planogram with optimized allocation
      const updated = planogramSpaces.map((p, i) => {
        const opt = data.optimized_allocation.find((o: any) => o.category_id === p.categoryId);
        return opt ? { ...p, linearFeet: opt.optimized_space, facings: opt.optimized_space * 5 } : p;
      });
      setPlanogramSpaces(updated);
    } catch (err) {
      console.error('Space optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (activeTab === 'overview') return <ErrorBoundary moduleName="Category Overview"><CategoryOverview categories={categories} /></ErrorBoundary>;
  if (activeTab === 'assortment') return <ErrorBoundary moduleName="Assortment"><AssortmentMerchandising categories={categories} skuDatabase={skuDatabase} canEdit={can('edit:forecast')} /></ErrorBoundary>;
  if (activeTab === 'space') return <ErrorBoundary moduleName="Space Planning"><SpacePlanning spaces={planogramSpaces} categories={categories} onOptimize={optimizeSpace} isOptimizing={isOptimizing} canEdit={can('edit:forecast')} /></ErrorBoundary>;
  if (activeTab === 'demand') return <ErrorBoundary moduleName="Retail Demand"><RetailDemand skuDatabase={skuDatabase} /></ErrorBoundary>;

  // Extended tabs (Category Scorecard, Lifecycle, Long Tail, Cannibalization)
  return (
    <ErrorBoundary moduleName="Retail Extended">
      <RetailExtendedTabs activeTab={activeTab} categories={categories} skuDatabase={skuDatabase} canEdit={can('edit:forecast')} />
    </ErrorBoundary>
  );
}

// ── Category Overview ───────────────────────────────────────────────────────
function CategoryOverview({ categories }: { categories: RetailCategory[] }) {
  const columns: TableColumn<RetailCategory>[] = [
    { key: 'name', header: 'Category', width: 200, sortable: true },
    { key: 'department', header: 'Department', width: 150, sortable: true },
    { key: 'skus', header: 'SKU Count', width: 100, sortable: true, align: 'right' },
    { key: 'revenue', header: 'Revenue', width: 130, sortable: true, align: 'right', render: (v: number) => `$${(v/1000).toFixed(0)}K` },
    { key: 'margin', header: 'Margin %', width: 100, sortable: true, align: 'right', render: (v: number) => `${v}%` },
    { 
      key: 'growthPct', header: 'YoY Growth', width: 120, sortable: true, align: 'right',
      render: (v: number, row: RetailCategory) => (
        <span style={{ color: v >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
          {v >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(v).toFixed(1)}%
        </span>
      )
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-3 mb-6">
        {[
          { label: 'Total Categories', value: categories.length, icon: <Tag size={16} /> },
          { label: 'Total Revenue', value: `$${(categories.reduce((a,c)=>a+c.revenue,0)/1000000).toFixed(2)}M`, icon: <DollarSign size={16} /> },
          { label: 'Avg Margin', value: `${(categories.reduce((a,c)=>a+c.margin,0)/categories.length).toFixed(1)}%`, icon: <Activity size={16} /> },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-infolet">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {kpi.icon} <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 500 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Category Performance</h3>
        <div style={{ height: '280px', marginBottom: '1.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories.slice(0,6).map(c => ({ name: c.name.slice(0,15), revenue: c.revenue/1000, margin: c.margin }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Revenue ($K)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Margin %', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
              <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="revenue" fill="var(--accent-primary)" radius={[4,4,0,0]} name="Revenue ($K)" />
              <Bar yAxisId="right" dataKey="margin" fill="#7c3aed" radius={[4,4,0,0]} name="Margin %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DataTable columns={columns} data={categories} stickyFirstColumn maxHeight={400} title="Category Matrix" />
      </div>
    </div>
  );
}

// ── Assortment & Merchandising (FILLED) ──────────────────────────────────────
function AssortmentMerchandising({ categories, skuDatabase, canEdit }: any) {
  const [selectedCluster, setSelectedCluster] = useState('cluster-a');
  const [analysis, setAnalysis] = useState<any[]>([]);

  const clusters = [
    { id: 'cluster-a', name: 'Urban Premium', stores: 42, desc: 'High income, premium SKUs' },
    { id: 'cluster-b', name: 'Suburban Family', stores: 105, desc: 'Bulk focus, value packs' },
    { id: 'cluster-c', name: 'Value Focused', stores: 68, desc: 'Price sensitive shoppers' },
  ];

  useEffect(() => {
    // Mock assortment analysis
    const clusterSkus = skuDatabase.slice(0, 10);
    setAnalysis(clusterSkus.map((sku: any) => {
      const profitPerFacing = (sku.asp - sku.unitCost) * sku.base / 4;
      const rec = profitPerFacing > 200 ? 'EXPAND' : profitPerFacing < 50 ? 'DROP' : 'KEEP';
      return {
        sku: sku.id,
        name: sku.name,
        revenue: sku.base * sku.asp,
        profit: (sku.asp - sku.unitCost) * sku.base,
        profitPerFacing: Math.round(profitPerFacing),
        turnRate: 8 + Math.random() * 4,
        recommendation: rec,
      };
    }));
  }, [selectedCluster, skuDatabase]);

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem' }}>
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Store Clusters</h3>
        {clusters.map(cluster => (
          <div
            key={cluster.id}
            onClick={() => setSelectedCluster(cluster.id)}
            className="card"
            style={{
              padding: '1rem',
              cursor: 'pointer',
              border: selectedCluster === cluster.id ? '2px solid var(--accent-primary)' : '0.5px solid var(--border-color)',
              background: selectedCluster === cluster.id ? 'var(--accent-primary-light)' : 'var(--color-background-primary)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px', color: selectedCluster === cluster.id ? 'var(--accent-primary)' : 'var(--text-main)' }}>{cluster.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cluster.stores} stores · {cluster.desc}</div>
          </div>
        ))}
      </div>
      
      <div style={{ flex: 1 }}>
        <div className="workspace-panel shadow-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              Assortment Keep/Drop/Add Analysis — {clusters.find(c => c.id === selectedCluster)?.name}
            </h3>
            {canEdit && (
              <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <Download size={13} className="mr-1" /> Export Recommendations
              </button>
            )}
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Name</th><th>Revenue</th><th>Profit</th><th>Profit/Facing</th><th>Turn Rate</th><th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map(item => (
                  <tr key={item.sku}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{item.sku}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${(item.revenue/1000).toFixed(1)}K</td>
                    <td style={{ textAlign: 'right' }}>${(item.profit/1000).toFixed(1)}K</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.profitPerFacing > 200 ? '#16a34a' : item.profitPerFacing < 50 ? '#dc2626' : 'inherit' }}>
                      ${item.profitPerFacing}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.turnRate.toFixed(1)}x</td>
                    <td>
                      <span className="badge" style={{
                        background: item.recommendation === 'EXPAND' ? '#eaf3de' : item.recommendation === 'DROP' ? '#fef2f2' : '#f1f5f9',
                        color: item.recommendation === 'EXPAND' ? '#16a34a' : item.recommendation === 'DROP' ? '#dc2626' : '#64748b',
                        border: `1px solid ${item.recommendation === 'EXPAND' ? '#16a34a' : item.recommendation === 'DROP' ? '#dc2626' : '#cbd5e1'}`,
                        fontWeight: 700,
                      }}>
                        {item.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Space Planning with Solver ───────────────────────────────────────────────
function SpacePlanning({ spaces, categories, onOptimize, isOptimizing, canEdit }: any) {
  const chartData = spaces.map((s: PlanogramSpace) => {
    const cat = categories.find((c: RetailCategory) => c.id === s.categoryId);
    return {
      category: cat?.name.slice(0, 12) || s.categoryId,
      spaceShare: s.spaceSharePct,
      salesShare: s.salesSharePct,
      delta: s.salesSharePct - s.spaceSharePct,
      margin: cat?.margin || 0,
    };
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Macro Space Allocation (Planogram)</h3>
        {canEdit && (
          <button className="btn btn-primary" onClick={onOptimize} disabled={isOptimizing} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOptimizing ? <><div className="spin" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Optimizing...</> : <><Maximize size={16} /> Auto-Balance Space</>}
          </button>
        )}
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Space Share vs Sales Share Analysis</h4>
        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="spaceShare" name="Space Share" unit="%" tick={{ fontSize: 11 }} label={{ value: 'Space Share %', position: 'insideBottom', offset: -10, style: { fontSize: 11 } }} />
              <YAxis dataKey="salesShare" name="Sales Share" unit="%" tick={{ fontSize: 11 }} label={{ value: 'Sales Share %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <ZAxis dataKey="margin" range={[100, 800]} name="Margin" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name="Categories" data={chartData} fill="var(--accent-primary)">
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.delta > 5 ? '#d97706' : entry.delta < -5 ? '#dc2626' : '#16a34a'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
          🟢 Optimal allocation · 🟡 Under-spaced (add shelf space) · 🔴 Over-spaced (reduce allocation)
        </div>
      </div>

      <div className="workspace-panel shadow-sm">
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Allocation Table with Recommendations</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Category</th><th>Linear Feet</th><th>Facings</th><th>Space Share</th><th>Sales Share</th><th>Delta</th><th>Recommendation</th></tr>
            </thead>
            <tbody>
              {spaces.map((s: PlanogramSpace) => {
                const cat = categories.find((c: RetailCategory) => c.id === s.categoryId);
                const delta = s.salesSharePct - s.spaceSharePct;
                const isUnder = delta > 5;
                const isOver = delta < -5;
                const recommendation = isUnder ? `Add +${Math.round(delta * 10)} ft` : isOver ? `Remove ${Math.round(delta * 10)} ft` : 'Optimal';
                
                return (
                  <tr key={s.categoryId}>
                    <td style={{ fontWeight: 600 }}>{cat?.name || s.categoryId}</td>
                    <td style={{ textAlign: 'right' }}>{s.linearFeet} ft</td>
                    <td style={{ textAlign: 'right' }}>{s.facings.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{s.spaceSharePct}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.salesSharePct}%</td>
                    <td style={{ textAlign: 'right', color: isUnder ? '#d97706' : isOver ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: isUnder ? '#fffbeb' : isOver ? '#fef2f2' : '#eaf3de',
                        color: isUnder ? '#d97706' : isOver ? '#dc2626' : '#16a34a',
                        border: `1px solid ${isUnder ? '#d97706' : isOver ? '#dc2626' : '#16a34a'}`,
                      }}>
                        {recommendation}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Retail Demand (FILLED) ──────────────────────────────────────────────────
function RetailDemand({ skuDatabase }: any) {
  const [selectedStore, setSelectedStore] = useState('store-sf');
  
  const stores = [
    { id: 'store-sf', name: 'San Francisco Downtown', cluster: 'Urban Premium', forecast: 1245, actual: 1198, variance: -3.8 },
    { id: 'store-ny', name: 'NYC Times Square', cluster: 'Urban Premium', forecast: 2140, actual: 2265, variance: +5.8 },
    { id: 'store-la', name: 'LA Suburban', cluster: 'Suburban Family', forecast: 945, actual: 932, variance: -1.4 },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-4 mb-6">
        {[
          { label: 'Total Stores', value: '215', sub: 'Across 3 clusters' },
          { label: 'Avg Store-Level MAPE', value: '6.2%', sub: 'Better than 8% benchmark' },
          { label: 'Localization Factors', value: '12', sub: 'Demographics, weather, events' },
          { label: 'Markdown Revenue', value: '$2.4M', sub: 'Last quarter' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-infolet">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 300 }}>{kpi.value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Store-Level Demand Forecast</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Store</th><th>Cluster</th><th>Forecast (Units)</th><th>Actual (Units)</th><th>Variance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {stores.map(store => (
                <tr key={store.id} style={{ background: selectedStore === store.id ? 'var(--accent-primary-light)' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{store.name}</td>
                  <td><span className="badge badge-gray">{store.cluster}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{store.forecast.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{store.actual.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: Math.abs(store.variance) < 5 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                    {store.variance > 0 ? '+' : ''}{store.variance}%
                  </td>
                  <td>
                    <span className="badge" style={{ background: Math.abs(store.variance) < 5 ? '#eaf3de' : '#fffbeb', color: Math.abs(store.variance) < 5 ? '#16a34a' : '#d97706' }}>
                      {Math.abs(store.variance) < 5 ? 'On Target' : 'Review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 5 new Retail tabs injected at module bottom ────────────────────────────

export function RetailExtendedTabs({ activeTab, categories, skuDatabase, canEdit }: {
  activeTab: string;
  categories: RetailCategory[];
  skuDatabase: any[];
  canEdit: boolean;
}) {
  if (activeTab === 'scorecard') return <CategoryScorecards categories={categories} />;
  if (activeTab === 'lifecycle') return <ProductLifecycle skuDatabase={skuDatabase} categories={categories} />;
  if (activeTab === 'longtail') return <LongTailRationalization skuDatabase={skuDatabase} />;
  if (activeTab === 'cannibalization') return <CannibalizationAnalysis skuDatabase={skuDatabase} categories={categories} />;
  if (activeTab === 'roles') return <CategoryRolesView />;
  return null;
}

// ── Category Scorecards ───────────────────────────────────────────────────────
function CategoryScorecards({ categories }: { categories: RetailCategory[] }) {
  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-3 gap-6 mb-6">
        {categories.map(cat => {
          const score = Math.round(50 + (cat.margin / 2) + (cat.growthPct > 0 ? 15 : -5));
          const clampedScore = Math.min(100, Math.max(0, score));
          const grade = clampedScore >= 80 ? 'A' : clampedScore >= 65 ? 'B' : clampedScore >= 50 ? 'C' : 'D';
          const gradeColor = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#dc2626' }[grade] || '#64748b';
          return (
            <div key={cat.id} className="workspace-panel shadow-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cat.department}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 500, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Grade</div>
                </div>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ width: clampedScore + '%', height: '100%', background: gradeColor, borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Revenue', value: `$${(cat.revenue / 1000).toFixed(0)}K` },
                  { label: 'Margin', value: `${cat.margin}%` },
                  { label: 'SKU Count', value: cat.skus },
                  { label: 'YoY Growth', value: `${cat.growthPct > 0 ? '+' : ''}${cat.growthPct}%`, color: cat.growthPct > 0 ? '#16a34a' : '#dc2626' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: 'var(--bg-hover)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '3px' }}>{kpi.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: (kpi as any).color || 'var(--text-main)' }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', padding: '8px 10px', background: gradeColor + '15', borderRadius: '6px', fontSize: '0.78rem', color: gradeColor, fontWeight: 500 }}>
                {grade === 'A' && '✓ High performer — protect and grow'}
                {grade === 'B' && '→ Solid category — optimise space allocation'}
                {grade === 'C' && '⚠ Under-performing — review SKU count and promo'}
                {grade === 'D' && '✕ At risk — consider rationalisation or divestment'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Product Lifecycle Analysis ────────────────────────────────────────────────
function ProductLifecycle({ skuDatabase, categories }: { skuDatabase: any[], categories: RetailCategory[] }) {
  const stages = ['Introduction', 'Growth', 'Maturity', 'Decline'];
  const stageColors: Record<string, string> = {
    Introduction: '#7c3aed', Growth: '#16a34a', Maturity: '#2563eb', Decline: '#dc2626',
  };

  const classifyLifecycle = (sku: any) => {
    const growth = sku.growthPct ?? ((sku.type === 'trending-up' ? 12 : sku.type === 'trending-down' ? -8 : 2));
    const cv = sku.cv ?? 0.3;
    if (growth > 10) return 'Growth';
    if (growth > 2 && cv < 0.3) return 'Maturity';
    if (growth < -5 || cv > 0.6) return 'Decline';
    return 'Introduction';
  };

  const stageCounts: Record<string, number> = { Introduction: 0, Growth: 0, Maturity: 0, Decline: 0 };
  const skusWithStage = skuDatabase.map(sku => {
    const stage = classifyLifecycle(sku);
    stageCounts[stage]++;
    return { ...sku, stage };
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-4 mb-6">
        {stages.map(stage => (
          <div key={stage} className="kpi-infolet" style={{ borderTop: `3px solid ${stageColors[stage]}` }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{stage}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 300, color: stageColors[stage] }}>{stageCounts[stage]}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>SKUs in this stage</span>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>SKU Lifecycle Classification</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>SKU</th><th>Name</th><th>Category</th><th>CV</th><th>Growth</th><th>Lifecycle Stage</th><th>Recommended Action</th></tr>
            </thead>
            <tbody>
              {skusWithStage.map(sku => (
                <tr key={sku.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{sku.id}</td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sku.name}</td>
                  <td><span className="badge badge-gray">{sku.category}</span></td>
                  <td style={{ textAlign: 'right' }}>{sku.cv?.toFixed(2) ?? '—'}</td>
                  <td style={{ textAlign: 'right', color: (sku.growthPct ?? 0) > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {(sku.growthPct ?? 0) > 0 ? '+' : ''}{sku.growthPct?.toFixed(1) ?? '0.0'}%
                  </td>
                  <td>
                    <span className="badge" style={{ background: stageColors[sku.stage] + '20', color: stageColors[sku.stage], border: `1px solid ${stageColors[sku.stage]}` }}>
                      {sku.stage}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {sku.stage === 'Introduction' && 'Build awareness — invest in placement'}
                    {sku.stage === 'Growth' && 'Expand distribution — increase facings'}
                    {sku.stage === 'Maturity' && 'Maintain — optimise promo ROI'}
                    {sku.stage === 'Decline' && 'Review — markdown or delist'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Long Tail Analysis & SKU Rationalization ──────────────────────────────────
function LongTailRationalization({ skuDatabase }: { skuDatabase: any[] }) {
  const sorted = [...skuDatabase].sort((a, b) => (b.base * b.asp) - (a.base * a.asp));
  const totalRevenue = sorted.reduce((sum, s) => sum + s.base * s.asp, 0);
  let cumulativeRevenue = 0;
  const withCumulative = sorted.map((sku, i) => {
    const revenue = sku.base * sku.asp;
    cumulativeRevenue += revenue;
    const cumPct = (cumulativeRevenue / totalRevenue) * 100;
    return {
      ...sku, revenue,
      rank: i + 1,
      revenuePct: (revenue / totalRevenue) * 100,
      cumPct,
      zone: cumPct <= 80 ? 'Core (A)' : cumPct <= 95 ? 'Selective (B)' : 'Long Tail (C)',
      action: cumPct <= 80 ? 'KEEP & GROW' : cumPct <= 95 ? 'OPTIMISE' : 'RATIONALISE',
    };
  });

  const coreSKUs = withCumulative.filter(s => s.zone === 'Core (A)').length;
  const longTailSKUs = withCumulative.filter(s => s.zone === 'Long Tail (C)').length;
  const coreRevenuePct = withCumulative.filter(s => s.zone === 'Core (A)').reduce((a, s) => a + s.revenuePct, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-4 mb-6">
        {[
          { label: 'Core SKUs (80% revenue)', value: `${coreSKUs}`, sub: `${coreRevenuePct.toFixed(0)}% of revenue`, color: '#16a34a' },
          { label: 'Long Tail SKUs', value: `${longTailSKUs}`, sub: 'Candidates for rationalisation', color: '#dc2626' },
          { label: 'Total SKUs', value: `${sorted.length}`, sub: 'Across all categories', color: 'var(--text-main)' },
          { label: 'Pareto Efficiency', value: `${Math.round((coreSKUs / sorted.length) * 100)}%`, sub: 'SKUs driving 80% revenue', color: '#7c3aed' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-infolet">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Pareto Revenue Ranking — Long Tail Identification</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Rank</th><th>SKU</th><th>Revenue</th><th>Rev %</th><th>Cumulative %</th><th>Zone</th><th>Action</th></tr>
            </thead>
            <tbody>
              {withCumulative.map(sku => {
                const actionColors: Record<string, string> = { 'KEEP & GROW': '#16a34a', 'OPTIMISE': '#d97706', 'RATIONALISE': '#dc2626' };
                const zoneColors: Record<string, string> = { 'Core (A)': '#16a34a', 'Selective (B)': '#2563eb', 'Long Tail (C)': '#dc2626' };
                return (
                  <tr key={sku.id}>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', width: '50px' }}>#{sku.rank}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{sku.id}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${(sku.revenue / 1000).toFixed(1)}K</td>
                    <td style={{ textAlign: 'right' }}>{sku.revenuePct.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: sku.cumPct + '%', height: '100%', background: sku.cumPct <= 80 ? '#16a34a' : sku.cumPct <= 95 ? '#d97706' : '#dc2626', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.82rem' }}>{sku.cumPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: zoneColors[sku.zone] + '20', color: zoneColors[sku.zone], border: `1px solid ${zoneColors[sku.zone]}` }}>
                        {sku.zone}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: actionColors[sku.action] }}>{sku.action}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Cannibalization Analysis ──────────────────────────────────────────────────
function CannibalizationAnalysis({ skuDatabase, categories }: { skuDatabase: any[], categories: RetailCategory[] }) {
  // Compute cannibalization index: SKUs in same category with similar demand pattern
  const computeCannibalIndex = (sku1: any, sku2: any): number => {
    if (sku1.category !== sku2.category) return 0;
    const priceSimilarity = 1 - Math.abs(sku1.asp - sku2.asp) / Math.max(sku1.asp, sku2.asp);
    const demandSimilarity = 1 - Math.abs(sku1.base - sku2.base) / Math.max(sku1.base, sku2.base);
    return Math.round((priceSimilarity * 0.6 + demandSimilarity * 0.4) * 100);
  };

  const pairs: any[] = [];
  for (let i = 0; i < skuDatabase.length; i++) {
    for (let j = i + 1; j < skuDatabase.length; j++) {
      const idx = computeCannibalIndex(skuDatabase[i], skuDatabase[j]);
      if (idx > 40) {
        pairs.push({
          sku1: skuDatabase[i].id, sku2: skuDatabase[j].id,
          category: skuDatabase[i].category, index: idx,
          risk: idx > 75 ? 'High' : idx > 55 ? 'Medium' : 'Low',
          impact: `~${Math.round(idx * 0.3)}% demand transfer risk`,
        });
      }
    }
  }
  pairs.sort((a, b) => b.index - a.index);

  const highRisk = pairs.filter(p => p.risk === 'High').length;

  return (
    <div style={{ padding: '2rem' }}>
      <div className="grid grid-cols-3 mb-6">
        {[
          { label: 'Pairs Analysed', value: `${pairs.length}`, sub: 'Same-category SKU pairs', color: 'var(--accent-primary)' },
          { label: 'High-Risk Pairs', value: `${highRisk}`, sub: 'Cannibalisation index > 75', color: '#dc2626' },
          { label: 'Avg Index (High Risk)', value: pairs.filter(p=>p.risk==='High').length ? `${Math.round(pairs.filter(p=>p.risk==='High').reduce((a,p)=>a+p.index,0)/pairs.filter(p=>p.risk==='High').length)}` : '—', sub: 'Out of 100', color: '#d97706' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-infolet">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cannibalisation Risk Matrix</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Index is based on price proximity, demand overlap, and category fit. High scores (&gt;75) indicate one SKU likely draws demand from the other.
        </p>
        {pairs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No significant cannibalisation pairs detected across current SKU portfolio.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>SKU A</th><th>SKU B</th><th>Category</th><th>Cannibalisation Index</th><th>Risk Level</th><th>Impact Estimate</th></tr>
              </thead>
              <tbody>
                {pairs.slice(0, 20).map((pair, i) => {
                  const riskColors: Record<string, string> = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' };
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{pair.sku1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{pair.sku2}</td>
                      <td><span className="badge badge-gray">{pair.category}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <div style={{ width: '80px', height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: pair.index + '%', height: '100%', background: riskColors[pair.risk], borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontWeight: 700, color: riskColors[pair.risk] }}>{pair.index}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: riskColors[pair.risk] + '20', color: riskColors[pair.risk], border: `1px solid ${riskColors[pair.risk]}` }}>
                          {pair.risk}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pair.impact}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category Roles & Strategy ─────────────────────────────────────────────────
function CategoryRolesView() {
  const { state } = usePlatform();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoryRoles(state.selectedDataset)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [state.selectedDataset]);

  const roleColors: Record<string, string> = {
    'Destination': '#7c3aed',
    'Routine': '#2563eb',
    'Convenience': '#16a34a',
    'Seasonal/Occasional': '#d97706',
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Classifying category roles…</div>;
  if (!data?.categories) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load category roles.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Category Roles & Strategy</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Each category is classified into its strategic role — driving tailored assortment, pricing, space, and promotion tactics.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {data.categories.map((cat: any) => (
          <div key={cat.category} className="workspace-panel shadow-sm" style={{ borderTop: `4px solid ${roleColors[cat.role]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{cat.category}</div>
              <span className="badge" style={{ background: roleColors[cat.role] + '20', color: roleColors[cat.role], border: `1px solid ${roleColors[cat.role]}`, fontSize: '0.7rem', fontWeight: 700 }}>{cat.role}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px', minHeight: '52px' }}>{cat.definition}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Rev Share', value: `${cat.revenue_share_pct}%` },
                { label: 'Margin', value: `${cat.margin_pct}%` },
                { label: 'Frequency', value: cat.purchase_frequency },
                { label: 'Shelf Priority', value: cat.shelf_priority },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg-hover)', padding: '6px 8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Recommended Tactics</div>
            {cat.tactics.map((t: string, i: number) => (
              <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: roleColors[cat.role] }}>•</span> {t}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Role framework reference */}
      <div className="workspace-panel shadow-sm">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Category Role Framework</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Role</th><th>Definition</th><th>Shelf Priority</th><th>Categories</th></tr></thead>
            <tbody>
              {Object.entries(data.playbook).map(([role, pb]: any) => {
                const count = data.categories.filter((c: any) => c.role === role).length;
                return (
                  <tr key={role}>
                    <td><span className="badge" style={{ background: roleColors[role] + '20', color: roleColors[role], border: `1px solid ${roleColors[role]}`, fontWeight: 700 }}>{role}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pb.definition}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pb.shelf_priority}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: count > 0 ? roleColors[role] : 'var(--text-muted)' }}>{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
