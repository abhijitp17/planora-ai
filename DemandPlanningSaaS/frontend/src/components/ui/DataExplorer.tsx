'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Download, BarChart2 } from 'lucide-react';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { listRecords, getDatasetSummary, buildExportUrl, type RecordPage, type DatasetSummary } from '@/lib/api';
import { KPISkeletonRow } from '@/components/ui/Skeletons';

interface DataExplorerProps {
  datasetVersion: string;
}

type RecordRow = RecordPage['items'][0];

const COLUMNS: TableColumn<RecordRow>[] = [
  { key: 'date',          header: 'Date',           width: 160, sortable: true  },
  { key: 'sku',           header: 'SKU',             width: 140, sortable: true, stickyLeft: true } as any,
  { key: 'category',      header: 'Category',        width: 130, sortable: true  },
  { key: 'location',      header: 'Location',        width: 130, sortable: true  },
  { key: 'channel',       header: 'Channel',         width: 110, sortable: true  },
  {
    key: 'target_demand', header: 'Demand',          width: 110, sortable: true,
    align: 'right',
    render: (v: number) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v?.toLocaleString()}</span>,
  },
  { key: 'dataset_version', header: 'Version',       width: 160 },
];

export default function DataExplorer({ datasetVersion }: DataExplorerProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, pages: 1 });
  const [sortBy, setSortBy]   = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchRecords = useCallback(async (page = 1, size = 50, sb = sortBy, sd = sortDir, q = search) => {
    if (!datasetVersion) return;
    setIsLoading(true);
    try {
      const data = await listRecords({ dataset_version: datasetVersion, page, page_size: size, sort_by: sb, sort_dir: sd });
      setRecords(data.items);
      setPagination({ total: data.total, page: data.page, pageSize: data.page_size, pages: data.pages });
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [datasetVersion, sortBy, sortDir, search]);

  const fetchSummary = useCallback(async () => {
    if (!datasetVersion) return;
    setSummaryLoading(true);
    try {
      const data = await getDatasetSummary(datasetVersion);
      setSummary(data);
    } catch { setSummary(null); }
    finally { setSummaryLoading(false); }
  }, [datasetVersion]);

  useEffect(() => { fetchRecords(); fetchSummary(); }, [datasetVersion]);

  const handlePageChange     = (p: number) => fetchRecords(p, pagination.pageSize);
  const handlePageSizeChange = (s: number) => fetchRecords(1, s);
  const handleSortChange     = (col: string, dir: 'asc' | 'desc') => {
    setSortBy(col); setSortDir(dir); fetchRecords(1, pagination.pageSize, col, dir);
  };
  const handleSearchChange = (q: string) => {
    setSearch(q); fetchRecords(1, pagination.pageSize, sortBy, sortDir, q);
  };
  const handleExport = () => {
    const url = buildExportUrl(datasetVersion);
    window.open(url, '_blank');
  };

  if (!datasetVersion) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
        <p style={{ fontSize: '0.9rem' }}>Upload a dataset to explore records here.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Summary KPIs */}
      {summaryLoading ? <KPISkeletonRow /> : summary && (
        <div className="grid grid-cols-4 mb-6">
          {[
            { label: 'Total Records',   value: summary.total_records.toLocaleString(),   color: 'var(--accent-primary)' },
            { label: 'Unique SKUs',     value: summary.sku_count.toLocaleString(),        color: 'var(--text-main)' },
            { label: 'Categories',      value: summary.category_count.toLocaleString(),   color: 'var(--text-main)' },
            { label: 'Total Demand',    value: `${(summary.total_demand / 1000).toFixed(1)}K`, color: 'var(--status-good)' },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{kpi.label}</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 300, color: kpi.color }}>{kpi.value}</span>
              {kpi.label === 'Total Records' && summary.date_range.min && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {summary.date_range.min.slice(0,10)} → {summary.date_range.max.slice(0,10)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Data table */}
      <div className="workspace-panel shadow-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Dataset Records — <span style={{ color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{datasetVersion}</span>
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Server-side paginated · virtual scrolling · sortable columns
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fetchRecords(pagination.page, pagination.pageSize)}
              className="header-action-btn"
              title="Refresh"
            >
              <RefreshCw size={13}/><span>Refresh</span>
            </button>
            <button onClick={handleExport} className="header-action-btn">
              <Download size={13}/><span>Export All CSV</span>
            </button>
          </div>
        </div>

        <DataTable
          columns={COLUMNS}
          data={records}
          stickyFirstColumn
          virtualRows
          rowHeight={44}
          maxHeight={460}
          serverSide={{
            total:            pagination.total,
            page:             pagination.page,
            pageSize:         pagination.pageSize,
            pages:            pagination.pages,
            onPageChange:     handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            onSortChange:     handleSortChange,
            onSearchChange:   handleSearchChange,
            isLoading,
          }}
          onExport={handleExport}
          emptyMessage="No records found for this dataset."
        />
      </div>
    </div>
  );
}
