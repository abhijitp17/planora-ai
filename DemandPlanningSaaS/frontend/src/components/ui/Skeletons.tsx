'use client';

import React from 'react';

const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position: 800px 0; }
  }
`;

function Skeleton({ width = '100%', height = '1rem', borderRadius = '4px', style = {} }: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <style>{shimmer}</style>
      <div
        aria-hidden="true"
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--border-color) 50%, var(--bg-hover) 75%)',
          backgroundSize: '800px 100%',
          animation: 'shimmer 1.4s infinite linear',
          ...style,
        }}
      />
    </>
  );
}

export function KPISkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
          borderRadius: '6px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <Skeleton width="60%" height="12px" />
          <Skeleton width="45%" height="28px" />
          <Skeleton width="70%" height="10px" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
      borderRadius: '6px', padding: '1.5rem'
    }}>
      <Skeleton width="35%" height="16px" style={{ marginBottom: '1.5rem' }} />
      <Skeleton width="100%" height={`${height}px`} borderRadius="6px" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      border: '1px solid var(--border-color)', borderRadius: '8px',
      overflow: 'hidden', background: 'var(--bg-panel)'
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1rem', padding: '0.75rem 1rem',
        background: 'var(--bg-hover)', borderBottom: '2px solid var(--border-color)'
      }}>
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} width="80%" height="12px" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '1rem', padding: '0.75rem 1rem',
          borderBottom: r < rows - 1 ? '1px solid var(--border-color)' : 'none'
        }}>
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} width={c === 0 ? '90%' : '65%'} height="13px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <KPISkeletonRow />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          padding: '0.85rem 1.25rem', background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <Skeleton width="40%" height="11px" />
          <Skeleton width="75%" height="13px" />
        </div>
      ))}
    </div>
  );
}
