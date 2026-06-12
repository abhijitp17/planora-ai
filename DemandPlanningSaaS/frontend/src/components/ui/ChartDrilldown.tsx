'use client';

import React from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';

interface DrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  columns: TableColumn<any>[];
  summary?: { label: string; value: string | number; color?: string }[];
}

export function ChartDrilldownModal({
  isOpen, onClose, title, data, columns, summary
}: DrilldownModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: 'var(--bg-panel)', borderRadius: '12px',
        border: '1px solid var(--border-color)', width: '90%', maxWidth: '1000px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Drill-down detail view · {data.length} records
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px', borderRadius: '6px' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Summary KPIs (optional) */}
        {summary && summary.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--color-background-secondary)' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              {summary.map(kpi => (
                <div key={kpi.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 500, color: kpi.color || 'var(--text-main)' }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          <DataTable
            columns={columns}
            data={data}
            virtualRows
            maxHeight={400}
            stickyFirstColumn
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => {/* Export drill-down data */}}>
            Export to CSV
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage drill-down state
 */
export function useChartDrilldown() {
  const [drilldownState, setDrilldownState] = React.useState<{
    isOpen: boolean;
    title: string;
    data: any[];
    columns: TableColumn<any>[];
    summary?: any[];
  }>({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
  });

  const openDrilldown = (title: string, data: any[], columns: TableColumn<any>[], summary?: any[]) => {
    setDrilldownState({ isOpen: true, title, data, columns, summary });
  };

  const closeDrilldown = () => {
    setDrilldownState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    drilldownState,
    openDrilldown,
    closeDrilldown,
  };
}
