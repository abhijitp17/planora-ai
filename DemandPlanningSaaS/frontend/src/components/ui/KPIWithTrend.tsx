'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIWithTrendProps {
  label: string;
  value: string | number;
  kpiName: string;  // For historical lookup
  color?: string;
  subtext?: string;
}

export function KPIWithTrend({ label, value, kpiName, color, subtext }: KPIWithTrendProps) {
  const [trend, setTrend] = useState<{ delta: number; delta_pct: number; direction: 'up' | 'down' | 'flat' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch KPI history from backend
    fetch(`http://localhost:8000/api/analytics/kpi-history?kpi_name=${encodeURIComponent(kpiName)}&days=30`)
      .then(r => r.json())
      .then(data => {
        const direction = data.delta > 0.1 ? 'up' : data.delta < -0.1 ? 'down' : 'flat';
        setTrend({ delta: data.delta, delta_pct: data.delta_pct, direction });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [kpiName]);

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up' 
    ? (kpiName.includes('mape') || kpiName.includes('cost') ? '#dc2626' : '#16a34a')
    : trend?.direction === 'down'
    ? (kpiName.includes('mape') || kpiName.includes('cost') ? '#16a34a' : '#dc2626')
    : '#64748b';

  return (
    <div className="kpi-infolet">
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 300, color: color || 'var(--text-main)' }}>
          {value}
        </span>
        {!loading && trend && trend.direction !== 'flat' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.85rem', fontWeight: 600, color: trendColor }}>
            <TrendIcon size={14} />
            <span>{trend.delta > 0 ? '+' : ''}{trend.delta.toFixed(1)}</span>
          </div>
        )}
      </div>
      {subtext && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
          {subtext}
        </span>
      )}
      {!loading && trend && (
        <span style={{ fontSize: '0.65rem', color: trendColor, marginTop: '4px', display: 'block' }}>
          {trend.delta > 0 ? '▲' : trend.delta < 0 ? '▼' : '━'} {Math.abs(trend.delta_pct).toFixed(1)}% vs last month
        </span>
      )}
    </div>
  );
}
