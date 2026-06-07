'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface TableColumn<T> {
  key: keyof T & string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

export interface DataTableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  // Server-side pagination (optional)
  serverSide?: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onSortChange?: (col: string, dir: 'asc' | 'desc') => void;
    onSearchChange?: (q: string) => void;
    isLoading?: boolean;
  };
  // Client-side virtualisation
  virtualRows?: boolean;
  rowHeight?: number;
  maxHeight?: number;
  // Actions
  onExport?: () => void;
  exportLabel?: string;
  title?: string;
  emptyMessage?: string;
  stickyFirstColumn?: boolean;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

// ─────────────────────────────────────────────────────────────────────────────
// Sort icon
// ─────────────────────────────────────────────────────────────────────────────
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc')  return <ChevronUp   size={12} color="var(--accent-primary)" />;
  if (sorted === 'desc') return <ChevronDown size={12} color="var(--accent-primary)" />;
  return <ChevronsUpDown size={12} color="var(--text-muted)" style={{ opacity: 0.5 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DataTable
// ─────────────────────────────────────────────────────────────────────────────
export function DataTable<T extends object>({
  columns, data, serverSide, virtualRows = false, rowHeight = 44,
  maxHeight = 500, onExport, exportLabel = 'Export CSV', title,
  emptyMessage = 'No data available', stickyFirstColumn = false,
}: DataTableProps<T>) {
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter]   = useState('');
  const [searchInput, setSearchInput]     = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Convert our column defs to TanStack format
  const tanstackCols: ColumnDef<T>[] = columns.map(col => ({
    id: col.key,
    accessorKey: col.key,
    header: col.header,
    size: col.width ?? 150,
    enableSorting: col.sortable !== false,
    enableColumnFilter: col.filterable !== false,
    cell: ({ getValue, row }) => {
      const value = getValue();
      if (col.render) return col.render(value, row.original);
      return (
        <span style={{
          display: 'block',
          textAlign: col.align ?? 'left',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value == null ? '—' : String(value)}
        </span>
      );
    },
  }));

  const table = useReactTable({
    data,
    columns: tanstackCols,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      if (serverSide?.onSortChange && newSorting.length > 0) {
        serverSide.onSortChange(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualSorting: !!serverSide,
    manualFiltering: !!serverSide,
    manualPagination: !!serverSide,
    pageCount: serverSide?.pages ?? -1,
  });

  const { rows } = table.getRowModel();

  // Virtual rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  // Debounced search
  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (serverSide?.onSearchChange) serverSide.onSearchChange(val);
      else setGlobalFilter(val);
    }, 300);
  }, [serverSide]);

  const displayedRows = virtualRows ? virtualItems.map(vi => rows[vi.index]) : rows;
  const isLoading = serverSide?.isLoading ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {title && (
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h3>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: title ? 'auto' : 0 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search…"
              style={{
                padding: '6px 28px 6px 28px', border: '1px solid var(--border-color)',
                borderRadius: '6px', background: 'var(--bg-panel)', color: 'var(--text-main)',
                fontSize: '0.8rem', width: '180px', outline: 'none',
              }}
            />
            {searchInput && (
              <button onClick={() => handleSearchChange('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}
            >
              <Download size={13} />{exportLabel}
            </button>
          )}
          {/* Row count */}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {serverSide ? `${serverSide.total.toLocaleString()} rows` : `${rows.length.toLocaleString()} rows`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-panel)', position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div className="spin" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map((header, colIdx) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const isFirst = colIdx === 0 && stickyFirstColumn;
                    return (
                      <th
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        style={{
                          width: header.getSize(),
                          padding: '10px 12px',
                          background: 'var(--bg-hover)',
                          borderBottom: '2px solid var(--border-color)',
                          fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                          color: 'var(--text-main)', letterSpacing: '0.04em',
                          cursor: canSort ? 'pointer' : 'default',
                          userSelect: 'none', whiteSpace: 'nowrap',
                          textAlign: columns[colIdx]?.align ?? 'left',
                          position: isFirst ? 'sticky' : undefined,
                          left: isFirst ? 0 : undefined,
                          zIndex: isFirst ? 3 : undefined,
                          borderRight: isFirst ? '2px solid var(--border-color)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: columns[colIdx]?.align === 'right' ? 'flex-end' : 'flex-start' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon sorted={sorted} />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
          </table>
        </div>

        {/* Body — virtualised or normal */}
        <div
          ref={parentRef}
          style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: `${maxHeight}px` }}
        >
          {rows.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {emptyMessage}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody style={virtualRows ? { height: `${totalHeight}px`, display: 'block', position: 'relative' } : undefined}>
                {(virtualRows ? virtualItems : rows.map((r, i) => ({ index: i, start: 0 }))).map(vi => {
                  const row = rows[vi.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      style={virtualRows ? {
                        position: 'absolute', top: 0, left: 0, width: '100%',
                        height: `${rowHeight}px`,
                        transform: `translateY(${vi.start}px)`,
                      } : undefined}
                    >
                      {row.getVisibleCells().map((cell, colIdx) => {
                        const isFirst = colIdx === 0 && stickyFirstColumn;
                        return (
                          <td
                            key={cell.id}
                            style={{
                              width: cell.column.getSize(),
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--border-color)',
                              fontSize: '0.875rem', color: 'var(--text-main)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              textAlign: columns[colIdx]?.align ?? 'left',
                              position: isFirst ? 'sticky' : undefined,
                              left: isFirst ? 0 : undefined,
                              zIndex: isFirst ? 2 : undefined,
                              background: isFirst ? 'var(--bg-panel)' : undefined,
                              borderRight: isFirst ? '2px solid var(--border-color)' : undefined,
                              fontWeight: isFirst ? 600 : undefined,
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {serverSide && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rows per page</span>
            <select
              value={serverSide.pageSize}
              onChange={e => serverSide.onPageSizeChange(Number(e.target.value))}
              style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {((serverSide.page - 1) * serverSide.pageSize + 1).toLocaleString()}–
              {Math.min(serverSide.page * serverSide.pageSize, serverSide.total).toLocaleString()} of {serverSide.total.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[
              { icon: <ChevronsLeft size={14}/>, action: () => serverSide.onPageChange(1), disabled: serverSide.page <= 1 },
              { icon: <ChevronLeft  size={14}/>, action: () => serverSide.onPageChange(serverSide.page - 1), disabled: serverSide.page <= 1 },
              { icon: <ChevronRight size={14}/>, action: () => serverSide.onPageChange(serverSide.page + 1), disabled: serverSide.page >= serverSide.pages },
              { icon: <ChevronsRight size={14}/>, action: () => serverSide.onPageChange(serverSide.pages), disabled: serverSide.page >= serverSide.pages },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                disabled={btn.disabled}
                style={{
                  padding: '5px 8px', border: '1px solid var(--border-color)', borderRadius: '5px',
                  background: 'var(--bg-panel)', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  color: btn.disabled ? 'var(--text-muted)' : 'var(--text-main)',
                  opacity: btn.disabled ? 0.4 : 1, display: 'flex', alignItems: 'center',
                }}
              >
                {btn.icon}
              </button>
            ))}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 4px' }}>
              Page {serverSide.page} / {serverSide.pages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
