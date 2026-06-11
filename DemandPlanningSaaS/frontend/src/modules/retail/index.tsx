import React, { useEffect } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { RetailCategory, PlanogramSpace } from '@/types';
import { Store, Tag, Package, BarChart2, Maximize, AlertCircle, TrendingUp, TrendingDown, Layers, MapPin } from 'lucide-react';

const MOCK_CATEGORIES: RetailCategory[] = [
  { id: 'cat-01', name: 'Carbonated Beverages', department: 'Beverages', revenue: 1250000, margin: 45, skus: 120, growthPct: 4.2 },
  { id: 'cat-02', name: 'Salty Snacks', department: 'Snacks', revenue: 890000, margin: 38, skus: 85, growthPct: -1.5 },
  { id: 'cat-03', name: 'Skincare', department: 'Health & Beauty', revenue: 2100000, margin: 62, skus: 210, growthPct: 12.4 },
];

const MOCK_PLANOGRAM: PlanogramSpace[] = [
  { categoryId: 'cat-01', linearFeet: 240, facings: 1200, spaceSharePct: 25, salesSharePct: 29 },
  { categoryId: 'cat-02', linearFeet: 180, facings: 900, spaceSharePct: 18, salesSharePct: 20 },
  { categoryId: 'cat-03', linearFeet: 120, facings: 600, spaceSharePct: 12, salesSharePct: 49 },
];

export default function RetailModule() {
  const { state, dispatch } = usePlatform();
  const { activeTab, retailCategories, planogramSpaces } = state;

  useEffect(() => {
    if (retailCategories.length === 0) {
      dispatch({ type: 'SET_RETAIL_CATEGORIES', payload: MOCK_CATEGORIES });
      dispatch({ type: 'SET_PLANOGRAM_SPACES', payload: MOCK_PLANOGRAM });
    }
  }, [retailCategories.length, dispatch]);

  if (activeTab === 'overview') return <CategoryOverview categories={retailCategories} />;
  if (activeTab === 'assortment') return <AssortmentMerchandising categories={retailCategories} />;
  if (activeTab === 'space') return <SpacePlanning spaces={planogramSpaces} categories={retailCategories} />;
  if (activeTab === 'demand') return <RetailDemand />;

  return null;
}

// ── 1. Category Overview ───────────────────────────────────────────────────
function CategoryOverview({ categories }: { categories: RetailCategory[] }) {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Tag size={16}/> <span>Total Categories Managed</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>{categories.length}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <DollarSign size={16}/> <span>Total Category Revenue</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            ${(categories.reduce((acc, c) => acc + c.revenue, 0) / 1000000).toFixed(2)}M
          </div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Activity size={16}/> <span>Avg Gross Margin</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            {(categories.reduce((acc, c) => acc + c.margin, 0) / categories.length).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0 }}>Category Performance Matrix</h3>
        </div>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-hover)', textAlign: 'left' }}>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Category</th>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Department</th>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>SKU Count</th>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Revenue</th>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Margin</th>
              <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>YoY Growth</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</td>
                <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{c.department}</td>
                <td style={{ padding: '16px 24px' }}>{c.skus}</td>
                <td style={{ padding: '16px 24px' }}>${(c.revenue / 1000).toFixed(0)}k</td>
                <td style={{ padding: '16px 24px' }}>{c.margin}%</td>
                <td style={{ padding: '16px 24px', color: c.growthPct >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {c.growthPct >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                    {Math.abs(c.growthPct)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 2. Assortment & Merchandising ──────────────────────────────────────────
function AssortmentMerchandising({ categories }: { categories: RetailCategory[] }) {
  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100%' }}>
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Cluster Assortment</h3>
        <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-primary)' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cluster A (Urban Premium)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>42 Stores · High Income</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cluster B (Suburban Family)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>105 Stores · Bulk Focus</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cluster C (Value Value)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>68 Stores · Price Sensitive</div>
        </div>
      </div>
      <div className="card" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Layers size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h3>Assortment Sandbox</h3>
        <p>Select a cluster to optimize width/depth and perform Keep/Drop/Add analysis.</p>
        <button className="btn btn-outline" style={{ marginTop: '1rem' }}>Load Assortment Data</button>
      </div>
    </div>
  );
}

// ── 3. Space Planning ──────────────────────────────────────────────────────
function SpacePlanning({ spaces, categories }: { spaces: PlanogramSpace[], categories: RetailCategory[] }) {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Macro Space Allocation (Planogram)</h3>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Maximize size={16} /> Auto-Balance Space
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Linear Feet</th>
              <th style={{ padding: '12px' }}>Facings</th>
              <th style={{ padding: '12px' }}>Space Share</th>
              <th style={{ padding: '12px' }}>Sales Share</th>
              <th style={{ padding: '12px' }}>Allocation Status</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map(s => {
              const cat = categories.find(c => c.id === s.categoryId);
              const delta = s.salesSharePct - s.spaceSharePct;
              const isUnder = delta > 5;
              const isOver = delta < -5;
              
              return (
                <tr key={s.categoryId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{cat?.name}</td>
                  <td style={{ padding: '16px 12px' }}>{s.linearFeet} ft</td>
                  <td style={{ padding: '16px 12px' }}>{s.facings}</td>
                  <td style={{ padding: '16px 12px' }}>{s.spaceSharePct}%</td>
                  <td style={{ padding: '16px 12px' }}>{s.salesSharePct}%</td>
                  <td style={{ padding: '16px 12px' }}>
                    {isUnder && <span className="badge" style={{ background: 'var(--status-warn)', color: '#fff' }}>Under-spaced (+{delta}%)</span>}
                    {isOver && <span className="badge" style={{ background: 'var(--status-error)', color: '#fff' }}>Over-spaced ({delta}%)</span>}
                    {!isUnder && !isOver && <span className="badge" style={{ background: 'var(--status-good)', color: '#fff' }}>Optimal</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. Retail Demand ───────────────────────────────────────────────────────
function RetailDemand() {
  return (
    <div style={{ padding: '2rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
        <MapPin size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h3>Store-Level Demand</h3>
        <p>This module handles POS demand modeling, markdown optimization, and localized promotional lift.</p>
        <button className="btn btn-outline" style={{ marginTop: '1.5rem' }}>Sync POS Data</button>
      </div>
    </div>
  );
}

// Custom icons that were not imported but needed in the inline code
const DollarSign = ({size}:{size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const Activity = ({size}:{size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
