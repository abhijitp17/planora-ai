'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  Database, Plus, Link2, RefreshCw, BarChart2, PlusCircle, Trash2,
  PieChart as PieIcon, LineChart as LineIcon, AreaChart as AreaIcon, Play,
  Save, Eye, Settings, HelpCircle, HardDrive, LayoutGrid, ArrowUp, ArrowDown,
  Edit2, Download, Check, ListFilter, Code, Sparkles, X, LayoutGrid as DashboardIcon
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { type SKU, formatCurrency, CURRENCIES } from '@/types';

interface FilterDef {
  field: string;
  operator: '==' | '!=' | '>' | '<' | 'contains';
  value: string;
}

interface SavedQuery {
  id: string;
  name: string;
  source: string;
  dimension?: string;
  measure?: string;
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'table';
  filters?: FilterDef[];
  sortOrder?: 'asc' | 'desc' | 'none';
  limitCount?: number;
  width?: 'half' | 'full';
  sqlQuery?: string;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: SavedQuery[];
}

const DEFAULT_SOURCES = [
  { id: 'sqlite_canonical', name: 'SQLite Canonical DB', type: 'Database (SQL)', status: 'Connected', tables: ['demand_records', 'forecast_results', 'audit_logs'], size: '1.2 MB' },
  { id: 'm5_sample_json', name: 'M5 Sample Master Data', type: 'Static JSON', status: 'Connected', tables: ['master_skus', 'historical_runs'], size: '85 KB' },
  { id: 'postgres_replica', name: 'PostgreSQL Production Replica', type: 'PostgreSQL', status: 'Configured', tables: [], size: '—' }
];

const COLORS = ['#064e3b', '#d4af37', '#f97316', '#2563eb', '#7c3aed', '#10b981', '#ef4444'];

const MEASURE_LABELS: Record<string, string> = {
  onHand: 'Sum of On-Hand Quantity',
  inTransit: 'Sum of In-Transit Quantity',
  unitCost: 'Average Unit Cost',
  value: 'Inventory Carrying Value ($)',
  base: 'Base Target Demand',
  margin: 'Potential Gross Margin ($)',
  revenue: 'Forecast Revenue ($)',
  holdingCost: 'Carrying Cost ($)'
};

const normalizeField = (f: string): string => {
  const mapping: Record<string, string> = {
    on_hand: 'onHand',
    intransit: 'inTransit',
    in_transit: 'inTransit',
    unit_cost: 'unitCost',
    holding_cost_pct: 'holdingCostPct',
    lead_time: 'leadTime',
    lead_time_std_dev: 'leadTimeStdDev',
    supply_capacity: 'supplyCapacity',
    aop_volume: 'aopVolume',
    sys_mape: 'sysMape',
    hum_mape: 'humMape',
    override_rate: 'overrideRate',
    sku_id: 'id',
    sku: 'id'
  };
  const key = f.toLowerCase();
  return mapping[key] || f;
};

const isFinancialColumn = (c: string) => {
  const norm = c.toLowerCase();
  return norm.includes('cost') || norm.includes('revenue') || norm.includes('margin') || norm.includes('value') || norm.includes('price');
};

function parseAndExecuteSQL(queryText: string, skuDatabase: SKU[]): { data: any[]; columns: string[]; error?: string } {
  try {
    const q = queryText.trim().replace(/\s+/g, ' ');
    // Regex match: SELECT ... FROM ... WHERE ... GROUP BY ... ORDER BY ... LIMIT ...
    const selectMatch = q.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s+GROUP\s+BY\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!selectMatch) {
      return { data: [], columns: [], error: 'Syntax Error. Supported format: SELECT columns FROM skus [WHERE condition] [GROUP BY column] [ORDER BY column] [LIMIT count]' };
    }

    const selectCols = selectMatch[1].split(',').map(s => s.trim());
    const tableName = selectMatch[2].trim().toLowerCase();
    const whereCond = selectMatch[3] ? selectMatch[3].trim() : '';
    const groupByCol = selectMatch[4] ? selectMatch[4].trim() : '';
    const orderByCol = selectMatch[5] ? selectMatch[5].trim() : '';
    const limitVal = selectMatch[6] ? parseInt(selectMatch[6]) : null;

    if (tableName !== 'skus' && tableName !== 'master_skus') {
      return { data: [], columns: [], error: `Table "${tableName}" not found. Try querying table "skus" (containing demand database elements)` };
    }

    let records = [...skuDatabase];

    // 1. Filter conditions
    if (whereCond) {
      const conds = whereCond.split(/\s+AND\s+/i);
      conds.forEach(c => {
        const opMatch = c.match(/(\w+)\s*(=|>|<|LIKE)\s*(.*)/i);
        if (opMatch) {
          const field = normalizeField(opMatch[1].trim()) as keyof SKU;
          const op = opMatch[2].trim().toUpperCase();
          let rawVal = opMatch[3].trim().replace(/^['"]|['"]$/g, '');
          
          records = records.filter(r => {
            let rVal: any = r[field];
            if (rVal === undefined) return false;
            
            if (op === '=') {
              return String(rVal).toLowerCase() === String(rawVal).toLowerCase();
            } else if (op === '>') {
              return Number(rVal) > Number(rawVal);
            } else if (op === '<') {
              return Number(rVal) < Number(rawVal);
            } else if (op === 'LIKE') {
              const cleanVal = rawVal.replace(/%/g, '');
              return String(rVal).toLowerCase().includes(cleanVal.toLowerCase());
            }
            return true;
          });
        }
      });
    }

    // 2. Group By logic
    let results: any[] = [];
    if (groupByCol) {
      const key = normalizeField(groupByCol) === 'category' ? 'category' : 'id';
      const groups: Record<string, SKU[]> = {};
      records.forEach(r => {
        const val = r[key as keyof SKU] as string;
        if (!groups[val]) groups[val] = [];
        groups[val].push(r);
      });

      Object.keys(groups).forEach(gName => {
        const gItems = groups[gName];
        const rowObj: any = {};
        
        selectCols.forEach(col => {
          const aggMatch = col.match(/(SUM|AVG|COUNT)\((\w+)\)/i);
          if (aggMatch) {
            const op = aggMatch[1].toUpperCase();
            const field = normalizeField(aggMatch[2]) as keyof SKU;
            
            if (op === 'SUM') {
              const sum = gItems.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
              rowObj[col] = sum;
            } else if (op === 'AVG') {
              const sum = gItems.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
              rowObj[col] = Math.round(sum / gItems.length);
            } else if (op === 'COUNT') {
              rowObj[col] = gItems.length;
            }
          } else {
            const normCol = normalizeField(col);
            if (normCol === key) {
              rowObj[col] = gName;
            } else {
              rowObj[col] = gItems[0][normCol as keyof SKU] || '';
            }
          }
        });
        results.push(rowObj);
      });
    } else {
      records.forEach(r => {
        const rowObj: any = {};
        selectCols.forEach(col => {
          if (col === '*') {
            rowObj.id = r.id;
            rowObj.name = r.name;
            rowObj.category = r.category;
            rowObj.onHand = r.onHand;
            rowObj.unitCost = r.unitCost;
          } else {
            const normCol = normalizeField(col);
            rowObj[col] = r[normCol as keyof SKU];
          }
        });
        results.push(rowObj);
      });
    }

    // 3. Order By logic
    if (orderByCol) {
      const parts = orderByCol.split(/\s+/);
      const colName = parts[0].trim();
      const dir = parts[1] ? parts[1].toLowerCase() : 'asc';
      
      results.sort((a, b) => {
        let valA = a[colName] !== undefined ? a[colName] : 0;
        let valB = b[colName] !== undefined ? b[colName] : 0;
        if (typeof valA === 'string') {
          return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        } else {
          return dir === 'desc' ? valB - valA : valA - valB;
        }
      });
    }

    // 4. Limit logic
    if (limitVal !== null) {
      results = results.slice(0, limitVal);
    }

    return {
      data: results,
      columns: results.length > 0 ? Object.keys(results[0]) : selectCols,
    };
  } catch (err: any) {
    return { data: [], columns: [], error: `Execution Error: ${err.message}` };
  }
}

export default function BIModule() {
  const { state } = usePlatform();
  const { activeTab, skuDatabase, selectedCurrencyCode } = state;

  const activeCurrencySymbol = CURRENCIES.find(c => c.code === selectedCurrencyCode)?.symbol ?? '$';
  
  const isFinancialMeasure = (m: string) => {
    return m === 'unitCost' || m === 'value' || m === 'margin' || m === 'revenue' || m === 'holdingCost';
  };

  const getMeasureLabel = (m: string) => {
    const labels: Record<string, string> = {
      onHand: 'Sum of On-Hand Quantity',
      inTransit: 'Sum of In-Transit Quantity',
      unitCost: 'Average Unit Cost',
      value: `Inventory Carrying Value (${activeCurrencySymbol})`,
      base: 'Base Target Demand',
      margin: `Potential Gross Margin (${activeCurrencySymbol})`,
      revenue: `Forecast Revenue (${activeCurrencySymbol})`,
      holdingCost: `Carrying Cost (${activeCurrencySymbol})`
    };
    return labels[m] || m;
  };
  // Visual Query Builder State
  const [selectedSource, setSelectedSource] = useState('m5_sample_json');
  const [selectedTable, setSelectedTable] = useState('master_skus');
  const [dimension, setDimension] = useState('category');
  const [measure, setMeasure] = useState('value');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie' | 'table'>('bar');
  const [queryFilters, setQueryFilters] = useState<FilterDef[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [limitCount, setLimitCount] = useState<number>(0);
  const [queryName, setQueryName] = useState('');
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [hasRun, setHasRun] = useState(false);

  // Dashboards & Active Dashboard State
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string>('');

  // Save targets configuration
  const [saveTargetDashboardId, setSaveTargetDashboardId] = useState<string>('');
  const [saveNewDashboardName, setSaveNewDashboardName] = useState<string>('');

  // Dashboard creation/renaming inline states
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [newDashboardNameInput, setNewDashboardNameInput] = useState('');
  const [isRenamingDashboard, setIsRenamingDashboard] = useState(false);
  const [renameDashboardNameInput, setRenameDashboardNameInput] = useState('');

  // SQL Console Target Configuration & Visual Representation
  const [consoleWidgetName, setConsoleWidgetName] = useState('');
  const [consoleChartType, setConsoleChartType] = useState<'table' | 'bar' | 'line' | 'area' | 'pie'>('table');

  // Connection modal state
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connName, setConnName] = useState('');
  const [connType, setConnType] = useState('postgres');

  // Visualization Panel Tab
  const [vizTab, setVizTab] = useState<'chart' | 'sql' | 'console'>('chart');
  
  // Custom SQL Console state
  const [sqlConsoleInput, setSqlConsoleInput] = useState('SELECT category, SUM(onHand) AS total_stock FROM skus WHERE unitCost > 40 GROUP BY category');
  const [sqlConsoleResult, setSqlConsoleResult] = useState<{ data: any[]; columns: string[]; error?: string } | null>(null);

  // Global Dashboard Filters State
  const [globalCategory, setGlobalCategory] = useState<string>('All');
  const [globalMaxLeadTime, setGlobalMaxLeadTime] = useState<number>(30);
  const [globalStockLevel, setGlobalStockLevel] = useState<'All' | 'Low' | 'Out'>('All');
  
  // Dashboard layout configuration state
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId) || dashboards[0];
  const savedQueries = activeDashboard?.widgets ?? [];

  // Pre-load default queries/widgets and load multiple dashboards
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDashboards = localStorage.getItem('planora_bi_dashboards');
      const storedActiveId = localStorage.getItem('planora_bi_active_dashboard_id');
      
      let finalDashboards: Dashboard[] = [];
      let finalActiveId = '';

      if (storedDashboards) {
        try {
          finalDashboards = JSON.parse(storedDashboards);
        } catch { /* fallback */ }
      }

      if (finalDashboards.length === 0) {
        // Migrate from old single-dashboard model or set default layout
        const oldQueriesStr = localStorage.getItem('planora_bi_queries');
        let oldQueries: SavedQuery[] = [];
        if (oldQueriesStr) {
          try {
            oldQueries = JSON.parse(oldQueriesStr);
          } catch { /* fallback */ }
        }

        if (oldQueries.length === 0) {
          oldQueries = [
            { id: 'q1', name: 'On-Hand Inventory Value by Category', source: 'm5_sample_json', dimension: 'category', measure: 'value', chartType: 'bar', filters: [], sortOrder: 'desc', limitCount: 0, width: 'half' },
            { id: 'q2', name: 'Unit Cost Benchmark by SKU', source: 'm5_sample_json', dimension: 'sku', measure: 'unitCost', chartType: 'line', filters: [], sortOrder: 'none', limitCount: 15, width: 'half' },
            { id: 'q3', name: 'Warehouse Allocation Mix (Base Demand)', source: 'm5_sample_json', dimension: 'category', measure: 'base', chartType: 'pie', filters: [], sortOrder: 'none', limitCount: 0, width: 'full' }
          ];
        }

        const defaultDashboard: Dashboard = {
          id: 'default',
          name: 'Main Telemetry Dashboard',
          widgets: oldQueries
        };

        finalDashboards = [defaultDashboard];
        localStorage.setItem('planora_bi_dashboards', JSON.stringify(finalDashboards));
      }

      if (storedActiveId && finalDashboards.some(d => d.id === storedActiveId)) {
        finalActiveId = storedActiveId;
      } else {
        finalActiveId = finalDashboards[0].id;
        localStorage.setItem('planora_bi_active_dashboard_id', finalActiveId);
      }

      setDashboards(finalDashboards);
      setActiveDashboardId(finalActiveId);
      setSaveTargetDashboardId(finalActiveId);
    }
  }, []);

  // Filtering helper logic used by query execution
  const applyQueryFilters = (data: SKU[], filters: FilterDef[]) => {
    let output = [...data];
    filters.forEach(f => {
      const field = normalizeField(f.field) as keyof SKU;
      const valText = f.value.trim();
      if (!valText) return;

      output = output.filter(sku => {
        const itemVal = sku[field];
        if (itemVal === undefined || itemVal === null) return false;

        const isNum = !isNaN(Number(itemVal)) && !isNaN(Number(valText));
        const numItemVal = isNum ? Number(itemVal) : 0;
        const numVal = isNum ? Number(valText) : 0;

        switch (f.operator) {
          case '==':
            return isNum ? numItemVal === numVal : String(itemVal).toLowerCase() === valText.toLowerCase();
          case '!=':
            return isNum ? numItemVal !== numVal : String(itemVal).toLowerCase() !== valText.toLowerCase();
          case '>':
            return numItemVal > numVal;
          case '<':
            return numItemVal < numVal;
          case 'contains':
            return String(itemVal).toLowerCase().includes(valText.toLowerCase());
          default:
            return true;
        }
      });
    });
    return output;
  };

  // Perform dynamic query calculations
  const executeQuery = (dim = dimension, meas = measure, filters = queryFilters, order = sortOrder, limit = limitCount) => {
    if (!skuDatabase.length) return;

    let filtered = applyQueryFilters(skuDatabase, filters);
    let results: any[] = [];

    // Helper to evaluate measure on a SKU record with active currency rate
    const evalMeasure = (sku: SKU, field: string): number => {
      const val = (() => {
        switch (field) {
          case 'onHand': return sku.onHand;
          case 'inTransit': return sku.inTransit;
          case 'unitCost': return sku.unitCost;
          case 'value': return sku.onHand * sku.unitCost;
          case 'base': return sku.base;
          case 'margin': return sku.asp - sku.unitCost;
          case 'revenue': return sku.aopVolume * sku.asp;
          case 'holdingCost': return (sku.onHand * sku.unitCost * sku.holdingCostPct) / 100;
          default: return 0;
        }
      })();
      const rate = CURRENCIES.find(c => c.code === selectedCurrencyCode)?.rate ?? 1.0;
      return isFinancialMeasure(field) ? val * rate : val;
    };

    if (dim === 'category') {
      const groups: Record<string, { category: string; sum: number; count: number }> = {};
      filtered.forEach(sku => {
        const cat = sku.category || 'Unassigned';
        if (!groups[cat]) groups[cat] = { category: cat, sum: 0, count: 0 };
        groups[cat].sum += evalMeasure(sku, meas);
        groups[cat].count += 1;
      });

      results = Object.values(groups).map(g => ({
        name: g.category,
        value: meas === 'unitCost' ? Math.round(g.sum / g.count) : Math.round(g.sum)
      }));
    } else if (dim === 'sku') {
      results = filtered.map(sku => ({
        name: sku.id,
        value: Math.round(evalMeasure(sku, meas))
      }));
    }

    // Apply Sorting
    if (order === 'asc') {
      results.sort((a, b) => a.value - b.value);
    } else if (order === 'desc') {
      results.sort((a, b) => b.value - a.value);
    }

    // Apply limit
    if (limit > 0) {
      results = results.slice(0, limit);
    }

    setQueryResult(results);
    setHasRun(true);
  };

  // Run initial preview
  useEffect(() => {
    if (activeTab === 'query' && !hasRun) {
      executeQuery();
    }
  }, [activeTab, skuDatabase]);

  // Handle saving query/widget to active or chosen dashboard
  const saveQuery = () => {
    const name = queryName.trim() || `Custom Query (${dimension} by ${measure})`;
    let targetDashId = saveTargetDashboardId;
    let targetDashName = '';
    let updatedDashboards = [...dashboards];

    if (saveTargetDashboardId === 'new_dashboard') {
      const newName = saveNewDashboardName.trim() || `Custom Dashboard ${dashboards.length + 1}`;
      targetDashId = Date.now().toString();
      targetDashName = newName;
      const newDash: Dashboard = {
        id: targetDashId,
        name: newName,
        widgets: []
      };
      updatedDashboards.push(newDash);
    } else {
      const existing = dashboards.find(d => d.id === saveTargetDashboardId);
      if (existing) {
        targetDashName = existing.name;
      } else if (dashboards.length > 0) {
        targetDashId = dashboards[0].id;
        targetDashName = dashboards[0].name;
      } else {
        targetDashId = 'default';
        targetDashName = 'Main Telemetry Dashboard';
        updatedDashboards = [{ id: 'default', name: 'Main Telemetry Dashboard', widgets: [] }];
      }
    }

    if (editingWidgetId) {
      // Modify existing widget inside the dashboard it belongs to
      updatedDashboards = updatedDashboards.map(d => {
        const hasWidget = d.widgets.some(w => w.id === editingWidgetId);
        if (hasWidget) {
          return {
            ...d,
            widgets: d.widgets.map(w => {
              if (w.id === editingWidgetId) {
                return {
                  ...w,
                  name,
                  source: selectedSource,
                  dimension,
                  measure,
                  chartType,
                  filters: queryFilters,
                  sortOrder,
                  limitCount
                };
              }
              return w;
            })
          };
        }
        return d;
      });
      
      setDashboards(updatedDashboards);
      localStorage.setItem('planora_bi_dashboards', JSON.stringify(updatedDashboards));
      alert(`Updated widget "${name}"!`);
      setEditingWidgetId(null);
      setQueryName('');
    } else {
      // Add new widget
      const newQuery: SavedQuery = {
        id: Date.now().toString(),
        name,
        source: selectedSource,
        dimension,
        measure,
        chartType,
        filters: queryFilters,
        sortOrder,
        limitCount,
        width: 'half'
      };

      updatedDashboards = updatedDashboards.map(d => {
        if (d.id === targetDashId) {
          return { ...d, widgets: [...d.widgets, newQuery] };
        }
        return d;
      });

      setDashboards(updatedDashboards);
      localStorage.setItem('planora_bi_dashboards', JSON.stringify(updatedDashboards));
      setActiveDashboardId(targetDashId);
      localStorage.setItem('planora_bi_active_dashboard_id', targetDashId);
      alert(`Saved "${name}" to Dashboard "${targetDashName}"!`);
      setQueryName('');
      setSaveNewDashboardName('');
    }
  };

  // Save custom SQL query console widget to a dashboard sheet
  const saveConsoleWidget = () => {
    const name = consoleWidgetName.trim() || `SQL Query Result`;
    let targetDashId = saveTargetDashboardId;
    let targetDashName = '';
    let updatedDashboards = [...dashboards];

    if (saveTargetDashboardId === 'new_dashboard') {
      const newName = saveNewDashboardName.trim() || `Custom Dashboard ${dashboards.length + 1}`;
      targetDashId = Date.now().toString();
      targetDashName = newName;
      const newDash: Dashboard = {
        id: targetDashId,
        name: newName,
        widgets: []
      };
      updatedDashboards.push(newDash);
    } else {
      const existing = dashboards.find(d => d.id === saveTargetDashboardId);
      if (existing) {
        targetDashName = existing.name;
      } else if (dashboards.length > 0) {
        targetDashId = dashboards[0].id;
        targetDashName = dashboards[0].name;
      } else {
        targetDashId = 'default';
        targetDashName = 'Main Telemetry Dashboard';
        updatedDashboards = [{ id: 'default', name: 'Main Telemetry Dashboard', widgets: [] }];
      }
    }

    const newWidget: SavedQuery = {
      id: Date.now().toString(),
      name,
      source: selectedSource,
      sqlQuery: sqlConsoleInput,
      chartType: consoleChartType,
      width: 'half'
    };

    updatedDashboards = updatedDashboards.map(d => {
      if (d.id === targetDashId) {
        return { ...d, widgets: [...d.widgets, newWidget] };
      }
      return d;
    });

    setDashboards(updatedDashboards);
    localStorage.setItem('planora_bi_dashboards', JSON.stringify(updatedDashboards));
    setActiveDashboardId(targetDashId);
    localStorage.setItem('planora_bi_active_dashboard_id', targetDashId);
    alert(`Saved widget "${name}" to Dashboard "${targetDashName}"!`);
    setConsoleWidgetName('');
    setSaveNewDashboardName('');
  };

  // Delete widget from list in active dashboard
  const deleteQuery = (id: string) => {
    const updated = dashboards.map(d => {
      if (d.id === activeDashboardId) {
        return { ...d, widgets: d.widgets.filter(q => q.id !== id) };
      }
      return d;
    });
    setDashboards(updated);
    localStorage.setItem('planora_bi_dashboards', JSON.stringify(updated));
  };

  // Modify saved queries parameters and return to editor
  const editQueryDetails = (q: SavedQuery) => {
    setEditingWidgetId(q.id);
    setQueryName(q.name);
    setSelectedSource(q.source);
    setDimension(q.dimension ?? 'category');
    setMeasure(q.measure ?? 'value');
    setChartType(q.chartType === 'table' ? 'bar' : q.chartType);
    setQueryFilters(q.filters || []);
    setSortOrder(q.sortOrder || 'none');
    setLimitCount(q.limitCount || 0);
    
    // Switch to query tab
    const event = new CustomEvent('set-shell-tab', { detail: 'query' });
    window.dispatchEvent(event);
    executeQuery(q.dimension ?? 'category', q.measure ?? 'value', q.filters || [], q.sortOrder || 'none', q.limitCount || 0);
  };

  // Move widget position inside active dashboard widgets list
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= savedQueries.length) return;
    
    const updatedWidgets = [...savedQueries];
    const temp = updatedWidgets[index];
    updatedWidgets[index] = updatedWidgets[nextIndex];
    updatedWidgets[nextIndex] = temp;
    
    const updatedDashboards = dashboards.map(d => {
      if (d.id === activeDashboardId) {
        return { ...d, widgets: updatedWidgets };
      }
      return d;
    });
    setDashboards(updatedDashboards);
    localStorage.setItem('planora_bi_dashboards', JSON.stringify(updatedDashboards));
  };

  // Toggle widget width span between half and full inside active dashboard
  const toggleWidgetWidth = (id: string) => {
    const updated = dashboards.map(d => {
      if (d.id === activeDashboardId) {
        return {
          ...d,
          widgets: d.widgets.map(q => {
            if (q.id === id) {
              return { ...q, width: q.width === 'full' ? 'half' : 'full' as any };
            }
            return q;
          })
        };
      }
      return d;
    });
    setDashboards(updated);
    localStorage.setItem('planora_bi_dashboards', JSON.stringify(updated));
  };

  // Delete current dashboard sheet
  const handleDeleteDashboard = () => {
    if (dashboards.length <= 1) {
      alert('Cannot delete the only remaining dashboard sheet. Try renaming it instead.');
      return;
    }
    const current = dashboards.find(d => d.id === activeDashboardId);
    if (!current) return;
    if (!confirm(`Are you sure you want to delete the dashboard "${current.name}"? This will delete all widgets inside it.`)) return;
    
    const updated = dashboards.filter(d => d.id !== activeDashboardId);
    setDashboards(updated);
    localStorage.setItem('planora_bi_dashboards', JSON.stringify(updated));
    const nextActive = updated[0].id;
    setActiveDashboardId(nextActive);
    localStorage.setItem('planora_bi_active_dashboard_id', nextActive);
    alert('Dashboard deleted!');
  };

  // Generate equivalent SQL string
  const generateSQLText = () => {
    let selectMeasure = '';
    switch (measure) {
      case 'onHand': selectMeasure = 'SUM(on_hand) AS total_on_hand'; break;
      case 'inTransit': selectMeasure = 'SUM(in_transit) AS total_in_transit'; break;
      case 'unitCost': selectMeasure = 'AVG(unit_cost) AS avg_unit_cost'; break;
      case 'value': selectMeasure = 'SUM(on_hand * unit_cost) AS inventory_carrying_value'; break;
      case 'base': selectMeasure = 'SUM(base) AS base_demand'; break;
      case 'margin': selectMeasure = 'SUM((asp - unit_cost)) AS potential_gross_margin'; break;
      case 'revenue': selectMeasure = 'SUM(aop_volume * asp) AS forecast_revenue'; break;
      case 'holdingCost': selectMeasure = 'SUM(on_hand * unit_cost * holding_cost_pct / 100.0) AS carrying_costs'; break;
      default: selectMeasure = '*';
    }

    let whereClauses: string[] = [];
    queryFilters.forEach(f => {
      let valText = isNaN(Number(f.value)) ? `'${f.value}'` : f.value;
      if (f.operator === 'contains') {
        whereClauses.push(`${f.field} LIKE '%${f.value}%'`);
      } else {
        whereClauses.push(`${f.field} ${f.operator} ${valText}`);
      }
    });

    let whereSql = whereClauses.length > 0 ? `\nWHERE ${whereClauses.join(' AND ')}` : '';
    let groupBySql = `\nGROUP BY ${dimension === 'category' ? 'category' : 'sku_id'}`;
    
    let orderBySql = '';
    if (sortOrder === 'asc') orderBySql = `\nORDER BY ${measure} ASC`;
    else if (sortOrder === 'desc') orderBySql = `\nORDER BY ${measure} DESC`;

    let limitSql = limitCount > 0 ? `\nLIMIT ${limitCount}` : '';

    return `SELECT \n  ${dimension === 'category' ? 'category' : 'sku_id'},\n  ${selectMeasure}\nFROM ${selectedSource === 'sqlite_canonical' ? 'demand_planning.demand_records' : 'master_skus'}${whereSql}${groupBySql}${orderBySql}${limitSql};`;
  };

  // Mock SQL parser console interpreter
  const handleExecuteConsoleSQL = () => {
    const res = parseAndExecuteSQL(sqlConsoleInput, skuDatabase);
    setSqlConsoleResult(res);
  };

  // CSV Exporter
  const exportToCSV = (data: any[], fileName = 'query_results.csv') => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const cell = row[header] === null || row[header] === undefined ? '' : row[header];
        const stringified = String(cell).replace(/"/g, '""');
        return `"${stringified}"`;
      }).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Global Dashboard Filters Calculation ───
  const getFilteredDashboardData = () => {
    let out = [...skuDatabase];
    if (globalCategory !== 'All') {
      out = out.filter(s => s.category === globalCategory);
    }
    if (globalMaxLeadTime < 30) {
      out = out.filter(s => s.leadTime <= globalMaxLeadTime);
    }
    if (globalStockLevel === 'Low') {
      out = out.filter(s => s.onHand > 0 && s.onHand < 20);
    } else if (globalStockLevel === 'Out') {
      out = out.filter(s => s.onHand === 0);
    }
    return out;
  };

  const dashboardDataset = getFilteredDashboardData();

  // Compute KPI Scorecard values
  const kpis = {
    totalSkus: dashboardDataset.length,
    valuation: dashboardDataset.reduce((acc, s) => acc + (s.onHand * s.unitCost), 0),
    unitsOnHand: dashboardDataset.reduce((acc, s) => acc + s.onHand, 0),
    avgLeadTime: dashboardDataset.length > 0 
      ? Math.round(dashboardDataset.reduce((acc, s) => acc + s.leadTime, 0) / dashboardDataset.length) 
      : 0
  };

  // Helper to render saved widgets inside dashboard tab
  const renderDashboardWidget = (q: SavedQuery, index: number) => {
    let data: any[] = [];
    let isFinancial = false;
    let isError = false;
    let errorMsg = '';
    let columnsList: string[] = [];
    let sqlResult: any = null;

    if (q.sqlQuery) {
      sqlResult = parseAndExecuteSQL(q.sqlQuery, dashboardDataset);
      if (sqlResult.error) {
        isError = true;
        errorMsg = sqlResult.error;
      } else {
        columnsList = sqlResult.columns || [];
        const labelKey = columnsList[0];
        const valueKey = columnsList[1] || columnsList[0];
        data = sqlResult.data.map((r: any) => ({
          name: String(r[labelKey] ?? ''),
          value: Number(r[valueKey]) || 0,
          rawRow: r
        }));
        isFinancial = columnsList.some(col => isFinancialColumn(col));
      }
    } else {
      // Visual Query Builder widget
      const dim = q.dimension ?? 'category';
      const meas = q.measure ?? 'value';
      isFinancial = isFinancialMeasure(meas);
      
      let widgetDataset = applyQueryFilters(dashboardDataset, q.filters || []);

      const evalMeasure = (sku: SKU, field: string): number => {
        const val = (() => {
          switch (field) {
            case 'onHand': return sku.onHand;
            case 'inTransit': return sku.inTransit;
            case 'unitCost': return sku.unitCost;
            case 'value': return sku.onHand * sku.unitCost;
            case 'base': return sku.base;
            case 'margin': return sku.asp - sku.unitCost;
            case 'revenue': return sku.aopVolume * sku.asp;
            case 'holdingCost': return (sku.onHand * sku.unitCost * sku.holdingCostPct) / 100;
            default: return 0;
          }
        })();
        const rate = CURRENCIES.find(c => c.code === selectedCurrencyCode)?.rate ?? 1.0;
        return isFinancialMeasure(field) ? val * rate : val;
      };

      if (dim === 'category') {
        const groups: Record<string, { category: string; sum: number; count: number }> = {};
        widgetDataset.forEach(sku => {
          const cat = sku.category || 'Unassigned';
          if (!groups[cat]) groups[cat] = { category: cat, sum: 0, count: 0 };
          groups[cat].sum += evalMeasure(sku, meas);
          groups[cat].count += 1;
        });
        data = Object.values(groups).map(g => ({
          name: g.category,
          value: meas === 'unitCost' ? Math.round(g.sum / g.count) : Math.round(g.sum)
        }));
      } else if (dim === 'sku') {
        data = widgetDataset.map(sku => ({
          name: sku.id,
          value: Math.round(evalMeasure(sku, meas))
        }));
      }

      if (q.sortOrder === 'asc') {
        data.sort((a, b) => a.value - b.value);
      } else if (q.sortOrder === 'desc') {
        data.sort((a, b) => b.value - a.value);
      }

      if (q.limitCount && q.limitCount > 0) {
        data = data.slice(0, q.limitCount);
      }
    }

    const isFullWidth = q.width === 'full';

    return (
      <div 
        key={q.id} 
        className={`workspace-panel flex flex-col transition-all duration-200 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`} 
        style={{ 
          height: '350px',
          border: isEditingLayout ? '1.5px dashed var(--accent-primary)' : '1px solid var(--border-color)',
          boxShadow: isEditingLayout ? '0 0 6px rgba(6, 78, 59, 0.1)' : 'none',
          position: 'relative'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <div>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{q.name}</h4>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {q.sqlQuery ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Code size={11} /> Ad Hoc SQL Widget
                </span>
              ) : (
                `${normalizeField(q.dimension ?? 'category')} grouped by ${getMeasureLabel(q.measure ?? 'value')}`
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingLayout ? (
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', borderRadius: '4px' }}>
                <button onClick={() => toggleWidgetWidth(q.id)} className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                  {isFullWidth ? 'Make Split' : 'Make Full'}
                </button>
                <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="btn btn-outline" style={{ padding: '2px 4px' }}>
                  <ArrowUp size={11} />
                </button>
                <button onClick={() => moveWidget(index, 'down')} disabled={index === savedQueries.length - 1} className="btn btn-outline" style={{ padding: '2px 4px' }}>
                  <ArrowDown size={11} />
                </button>
                {!q.sqlQuery && (
                  <button onClick={() => editQueryDetails(q)} className="btn btn-outline" style={{ padding: '2px 4px', color: 'var(--accent-primary)' }} title="Edit Query Parameters">
                    <Edit2 size={11} />
                  </button>
                )}
                <button onClick={() => deleteQuery(q.id)} className="btn btn-outline" style={{ padding: '2px 4px', color: 'var(--status-error)' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => exportToCSV(q.sqlQuery ? sqlResult?.data : data, `${q.name.toLowerCase().replace(/\s+/g, '_')}.csv`)} 
                className="btn btn-outline" 
                style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                title="Export Widget Data to CSV"
              >
                <Download size={12} className="mr-1" /> CSV
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', minHeight: 0 }} className="mt-2">
          {isError ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-error)', fontSize: '0.8rem', padding: '12px', textAlign: 'center' }}>
              ⚠️ SQL Error: {errorMsg}
            </div>
          ) : data.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No matches found for the active filter set.
            </div>
          ) : q.chartType === 'table' && q.sqlQuery ? (
            <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '0.75rem' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    {columnsList.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sqlResult?.data.map((row: any, rIdx: number) => (
                    <tr key={rIdx}>
                      {columnsList.map(col => (
                        <td key={col} style={{ fontWeight: typeof row[col] === 'string' ? 600 : 500 }}>
                          {row[col] !== null && row[col] !== undefined ? (
                            isFinancialColumn(col) ? formatCurrency(Number(row[col]) || 0, selectedCurrencyCode) : row[col].toLocaleString()
                          ) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {q.chartType === 'line' ? (
                <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isFinancial ? formatCurrency(val, selectedCurrencyCode, true) : val.toLocaleString()} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancial ? [formatCurrency(val, selectedCurrencyCode), 'Value'] : [val.toLocaleString(), 'Value']} />
                  <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              ) : q.chartType === 'area' ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isFinancial ? formatCurrency(val, selectedCurrencyCode, true) : val.toLocaleString()} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancial ? [formatCurrency(val, selectedCurrencyCode), 'Value'] : [val.toLocaleString(), 'Value']} />
                  <Area type="monotone" dataKey="value" fill="var(--accent-primary-light)" stroke="var(--accent-primary)" strokeWidth={2} />
                </AreaChart>
              ) : q.chartType === 'pie' ? (
                <PieChart>
                  <Pie data={data} cx="50%" cy="45%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                    {data.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => isFinancial ? [formatCurrency(val, selectedCurrencyCode), 'Value'] : [val.toLocaleString(), 'Value']} />
                  <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                </PieChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isFinancial ? formatCurrency(val, selectedCurrencyCode, true) : val.toLocaleString()} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancial ? [formatCurrency(val, selectedCurrencyCode), 'Value'] : [val.toLocaleString(), 'Value']} />
                  <Bar dataKey="value" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  // Helper to add query filters
  const addQueryFilter = () => {
    setQueryFilters([...queryFilters, { field: 'onHand', operator: '>', value: '' }]);
  };

  // Helper to remove query filter
  const removeQueryFilter = (index: number) => {
    const nextFilters = queryFilters.filter((_, idx) => idx !== index);
    setQueryFilters(nextFilters);
  };

  // Helper to update query filter values
  const updateQueryFilter = (index: number, key: keyof FilterDef, val: string) => {
    const nextFilters = queryFilters.map((f, idx) => {
      if (idx === index) {
        return { ...f, [key]: val };
      }
      return f;
    });
    setQueryFilters(nextFilters);
  };

  return (
    <ErrorBoundary moduleName="Business Intelligence">
      <div className="container">
        
        {/* DATA SOURCES TAB */}
        {activeTab === 'sources' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Connectors & Datasets</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Link data sources, map relational keys, and compile tables.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsConnectOpen(true)}>
                <Plus size={14} className="mr-2" /> Connect Data Source
              </button>
            </div>

            {/* Grid list of connected sources */}
            <div className="grid grid-cols-3 mb-6">
              {DEFAULT_SOURCES.map(source => (
                <div key={source.id} className="workspace-panel shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database size={18} color="var(--accent-primary)" />
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{source.name}</h4>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <strong>Connector:</strong> {source.type}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <strong>Payload Size:</strong> {source.size}
                    </div>
                    {source.tables.length > 0 && (
                      <div className="mt-3">
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Schema Tables</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {source.tables.map(t => <span key={t} className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-top mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span className="badge" style={{
                      background: source.status === 'Connected' ? 'var(--status-good-bg)' : 'var(--bg-hover)',
                      color: source.status === 'Connected' ? 'var(--status-good)' : 'var(--text-muted)',
                    }}>{source.status}</span>
                    <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                      <Settings size={12} /> Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mock Database connection modal */}
            {isConnectOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div className="workspace-panel" style={{ width: '400px', background: 'var(--bg-panel)' }}>
                  <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600 }}>Connect New Data Source</h3>
                  <div className="mb-4">
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Source Name</label>
                    <input type="text" className="form-control" placeholder="E.g., Production Postgres Replica" value={connName} onChange={e => setConnName(e.target.value)} />
                  </div>
                  <div className="mb-4">
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Connector Type</label>
                    <select className="form-control" value={connType} onChange={e => setConnType(e.target.value)}>
                      <option value="postgres">PostgreSQL Relational DB</option>
                      <option value="mysql">MySQL Database</option>
                      <option value="csv">Local CSV/Excel Ingestion</option>
                      <option value="sqlite">SQLite Database File</option>
                      <option value="salesforce">Salesforce CRM API</option>
                    </select>
                  </div>
                  {connType !== 'csv' && (
                    <div className="mb-4">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Connection String / Host</label>
                      <input type="text" className="form-control" placeholder="postgresql://user:password@host:5432/db" />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-6">
                    <button className="btn btn-outline" onClick={() => setIsConnectOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => { setIsConnectOpen(false); setConnName(''); alert('Successfully connected data source and mapped schema!'); }}>Connect & Scan</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISUAL QUERY BUILDER TAB */}
        {activeTab === 'query' && (
          <div className="grid grid-cols-4 gap-6">
            
            {/* Visual builder sidebar panel */}
            <div style={{ gridColumn: 'span 1' }}>
              <div className="workspace-panel shadow-sm">
                <div className="flex justify-between items-center mb-4 border-bottom pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Query Editor</h3>
                  {editingWidgetId && (
                    <span className="badge" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--text-main)', fontSize: '0.65rem' }}>
                      Editing Mode
                    </span>
                  )}
                </div>
                
                {/* Source Selection */}
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Data Source</label>
                  <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)} className="form-control">
                    <option value="sqlite_canonical">SQLite Canonical DB</option>
                    <option value="m5_sample_json">M5 Sample Master Data</option>
                  </select>
                </div>

                {/* Table selection */}
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Table</label>
                  <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className="form-control">
                    {selectedSource === 'sqlite_canonical' ? (
                      <>
                        <option value="demand_records">demand_records</option>
                        <option value="forecast_results">forecast_results</option>
                      </>
                    ) : (
                      <>
                        <option value="master_skus">master_skus (products)</option>
                        <option value="historical_runs">historical_runs</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Dimensions */}
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Group By (Dimension)</label>
                  <select value={dimension} onChange={e => setDimension(e.target.value)} className="form-control">
                    <option value="category">Category (Product Line)</option>
                    <option value="sku">SKU ID</option>
                  </select>
                </div>

                {/* Measures & Formulas */}
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Measure (Formula Value)</label>
                  <select value={measure} onChange={e => setMeasure(e.target.value)} className="form-control">
                    <optgroup label="Standard Fields">
                      <option value="onHand">Sum of On-Hand Quantity</option>
                      <option value="inTransit">Sum of In-Transit Quantity</option>
                      <option value="unitCost">Average Unit Cost</option>
                      <option value="base">Base Target Demand</option>
                    </optgroup>
                    <optgroup label="Calculated Formulas (Insights Expression)">
                      <option value="value">Inventory Value (onHand * unitCost)</option>
                      <option value="margin">Gross Unit Margin (asp - unitCost)</option>
                      <option value="revenue">Consensus Revenue (aopVolume * asp)</option>
                      <option value="holdingCost">Annual Carrying Costs (onHand * unitCost * holdingCostPct / 100)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Dynamic Filters UI */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Filters</label>
                    <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={addQueryFilter}>
                      <Plus size={10} className="mr-1" /> Add
                    </button>
                  </div>
                  {queryFilters.length === 0 ? (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '4px', padding: '6px', textAlign: 'center' }}>
                      No filter conditions.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {queryFilters.map((f, idx) => (
                        <div key={idx} className="flex gap-1 items-center bg-gray-50 p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)', borderRadius: '4px' }}>
                          <select value={f.field} onChange={e => updateQueryFilter(idx, 'field', e.target.value)} className="form-control" style={{ padding: '2px 4px', fontSize: '0.7rem', flex: 1.2 }}>
                            <option value="category">Category</option>
                            <option value="id">SKU ID</option>
                            <option value="onHand">On Hand</option>
                            <option value="unitCost">Unit Cost</option>
                            <option value="leadTime">Lead Time</option>
                            <option value="sysMape">MAPE (%)</option>
                          </select>
                          <select value={f.operator} onChange={e => updateQueryFilter(idx, 'operator', e.target.value as any)} className="form-control" style={{ padding: '2px 4px', fontSize: '0.7rem', flex: 0.8 }}>
                            <option value="==">=</option>
                            <option value="!=">!=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="contains">like</option>
                          </select>
                          <input type="text" value={f.value} onChange={e => updateQueryFilter(idx, 'value', e.target.value)} placeholder="Val" className="form-control" style={{ padding: '2px 4px', fontSize: '0.7rem', flex: 1 }} />
                          <button onClick={() => removeQueryFilter(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-error)' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sorting & Limits */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Sort By Value</label>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="form-control">
                      <option value="none">Unsorted</option>
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Limit Row Count</label>
                    <input type="number" min={0} value={limitCount || ''} onChange={e => setLimitCount(parseInt(e.target.value) || 0)} className="form-control" placeholder="All" />
                  </div>
                </div>

                {/* Visual Chart Type */}
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Chart Type</label>
                  <div className="flex gap-2">
                    {[
                      { type: 'bar', icon: <BarChart2 size={13} /> },
                      { type: 'line', icon: <LineIcon size={13} /> },
                      { type: 'area', icon: <AreaIcon size={13} /> },
                      { type: 'pie', icon: <PieIcon size={13} /> },
                    ].map(btn => (
                      <button
                        key={btn.type}
                        onClick={() => setChartType(btn.type as any)}
                        className={`btn ${chartType === btn.type ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flex: 1, padding: '5px' }}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary w-full mt-4" onClick={() => executeQuery(dimension, measure, queryFilters, sortOrder, limitCount)}>
                  <Play size={14} className="mr-2" /> Execute Query
                </button>
              </div>
            </div>

            {/* Visualizer output panel */}
            <div className="col-span-3 flex flex-col gap-6" style={{ gridColumn: 'span 3' }}>
              
              {/* Tabs for query outputs */}
              <div className="workspace-panel shadow-sm">
                <div className="flex justify-between items-center mb-4 border-bottom pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex gap-2">
                    <button onClick={() => setVizTab('chart')} className={`btn ${vizTab === 'chart' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      <BarChart2 size={12} className="mr-1" /> Visual Chart
                    </button>
                    <button onClick={() => setVizTab('sql')} className={`btn ${vizTab === 'sql' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      <Code size={12} className="mr-1" /> SQL Preview
                    </button>
                    <button onClick={() => setVizTab('console')} className={`btn ${vizTab === 'console' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      <Sparkles size={12} className="mr-1" /> SQL Console
                    </button>
                  </div>

                  {vizTab === 'chart' && queryResult.length > 0 && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Widget Title" 
                        value={queryName} 
                        onChange={e => setQueryName(e.target.value)} 
                        style={{ width: '150px', padding: '4px 8px', fontSize: '0.75rem' }} 
                      />
                      <select
                        value={saveTargetDashboardId}
                        onChange={e => setSaveTargetDashboardId(e.target.value)}
                        className="form-control"
                        style={{ width: '150px', padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        {dashboards.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        <option value="new_dashboard">+ New Dashboard...</option>
                      </select>
                      {saveTargetDashboardId === 'new_dashboard' && (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="New Dashboard Name"
                          value={saveNewDashboardName}
                          onChange={e => setSaveNewDashboardName(e.target.value)}
                          style={{ width: '130px', padding: '4px 8px', fontSize: '0.75rem' }}
                        />
                      )}
                      <button className="btn btn-outline" onClick={saveQuery} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        <Save size={13} className="mr-1" /> 
                        {editingWidgetId ? 'Update Widget' : 'Save to Dashboard'}
                      </button>
                      {editingWidgetId && (
                        <button className="btn btn-outline" onClick={() => { setEditingWidgetId(null); setQueryName(''); }} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--status-error)' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* VIZ VIEW 1: DYNAMIC CHART PREVIEW */}
                {vizTab === 'chart' && (
                  <div>
                    {queryResult.length === 0 ? (
                      <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                        <HelpCircle size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                        <p style={{ fontSize: '0.85rem' }}>Select grouping dimensions and query parameters to render the visual model.</p>
                      </div>
                    ) : (
                      <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'line' ? (
                            <LineChart data={queryResult}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => isFinancialMeasure(measure) ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancialMeasure(measure) ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                              <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          ) : chartType === 'area' ? (
                            <AreaChart data={queryResult}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => isFinancialMeasure(measure) ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancialMeasure(measure) ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                              <Area type="monotone" dataKey="value" fill="var(--accent-primary-light)" stroke="var(--accent-primary)" strokeWidth={3} />
                            </AreaChart>
                          ) : chartType === 'pie' ? (
                            <PieChart>
                              <Pie data={queryResult} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                                {queryResult.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                              </Pie>
                              <RechartsTooltip formatter={(val: any) => isFinancialMeasure(measure) ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                              <Legend />
                            </PieChart>
                          ) : (
                            <BarChart data={queryResult}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => isFinancialMeasure(measure) ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isFinancialMeasure(measure) ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                              <Bar dataKey="value" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* VIZ VIEW 2: GENERATED SQL */}
                {vizTab === 'sql' && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifySelf: 'flex-end', marginBottom: '8px' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>Auto Compiled from Visual Query Builder</span>
                    </div>
                    <pre style={{
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-main)',
                      padding: '16px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      margin: 0
                    }}>
                      {generateSQLText()}
                    </pre>
                  </div>
                )}

                {/* VIZ VIEW 3: INTERACTIVE SQL CONSOLE */}
                {vizTab === 'console' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Execute Custom SQL Statement against SKU Database
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          className="form-control"
                          rows={3}
                          style={{ fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, resize: 'vertical' }}
                          value={sqlConsoleInput}
                          onChange={e => setSqlConsoleInput(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleExecuteConsoleSQL} style={{ height: 'fit-content', alignSelf: 'flex-end' }}>
                          <Play size={14} className="mr-1" /> Run Query
                        </button>
                      </div>
                      <div className="mt-2" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        👉 Supported syntax: <code>SELECT category, SUM(onHand), AVG(unitCost) FROM skus WHERE unitCost &gt; 25 GROUP BY category ORDER BY category ASC LIMIT 5</code>. 
                        Use fields: <code>category</code>, <code>id</code> (SKU ID), <code>onHand</code>, <code>unitCost</code>, <code>leadTime</code>, <code>sysMape</code>.
                      </div>
                    </div>
                    {sqlConsoleResult && (() => {
                      const consoleColumns = sqlConsoleResult.columns || [];
                      const consoleData = sqlConsoleResult.data || [];
                      const consoleLabelKey = consoleColumns[0] || '';
                      const consoleValueKey = consoleColumns[1] || consoleColumns[0] || '';
                      const isConsoleFinancial = consoleColumns.some(col => isFinancialColumn(col));
                      const mappedConsoleData = consoleData.map((r: any) => ({
                        name: String(r[consoleLabelKey] ?? ''),
                        value: Number(r[consoleValueKey]) || 0
                      }));
                      return (
                        <div className="mt-2 border-top pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                          <div className="flex justify-between items-center mb-3">
                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Console Execution Results</h4>
                            {sqlConsoleResult.data.length > 0 && !sqlConsoleResult.error && (
                              <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => exportToCSV(sqlConsoleResult.data, 'sql_console_results.csv')}>
                                <Download size={11} className="mr-1" /> Export CSV
                              </button>
                            )}
                          </div>

                          {sqlConsoleResult.error ? (
                            <div style={{ padding: '12px', border: '1px solid var(--status-error)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--status-error)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                              ⚠️ {sqlConsoleResult.error}
                            </div>
                          ) : sqlConsoleResult.data.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', borderRadius: '4px' }}>
                              Empty set returned. 0 matching records.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4">
                              {/* Save to Dashboard controls */}
                              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', width: '100%' }}>
                                  <div className="flex items-center gap-1">
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Widget Title:</span>
                                    <input
                                      type="text"
                                      placeholder="E.g., Query Totals"
                                      className="form-control"
                                      value={consoleWidgetName}
                                      onChange={e => setConsoleWidgetName(e.target.value)}
                                      style={{ width: '150px', padding: '4px 8px', fontSize: '0.75rem' }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Chart Type:</span>
                                    <select
                                      value={consoleChartType}
                                      onChange={e => setConsoleChartType(e.target.value as any)}
                                      className="form-control"
                                      style={{ width: '110px', padding: '4px 8px', fontSize: '0.75rem' }}
                                    >
                                      <option value="table">Table Grid</option>
                                      <option value="bar">Bar Chart</option>
                                      <option value="line">Line Chart</option>
                                      <option value="area">Area Chart</option>
                                      <option value="pie">Pie Chart</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dashboard:</span>
                                    <select
                                      value={saveTargetDashboardId}
                                      onChange={e => setSaveTargetDashboardId(e.target.value)}
                                      className="form-control"
                                      style={{ width: '150px', padding: '4px 8px', fontSize: '0.75rem' }}
                                    >
                                      {dashboards.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                      ))}
                                      <option value="new_dashboard">+ New Dashboard...</option>
                                    </select>
                                  </div>
                                  {saveTargetDashboardId === 'new_dashboard' && (
                                    <div className="flex items-center gap-1">
                                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>New Name:</span>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="New Dashboard Name"
                                        value={saveNewDashboardName}
                                        onChange={e => setSaveNewDashboardName(e.target.value)}
                                        style={{ width: '130px', padding: '4px 8px', fontSize: '0.75rem' }}
                                      />
                                    </div>
                                  )}
                                  <button className="btn btn-primary" onClick={saveConsoleWidget} style={{ padding: '5px 12px', fontSize: '0.75rem', marginLeft: 'auto' }}>
                                    <Save size={13} className="mr-1" /> Save to Dashboard
                                  </button>
                                </div>
                              </div>

                              {/* Visualization output */}
                              {consoleChartType === 'table' ? (
                                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  <table>
                                    <thead>
                                      <tr>
                                        {consoleColumns.map(col => <th key={col}>{col}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {consoleData.map((row, idx) => (
                                        <tr key={idx}>
                                          {consoleColumns.map(col => (
                                            <td key={col} style={{ fontWeight: typeof row[col] === 'string' ? 600 : 500 }}>
                                              {row[col] !== null && row[col] !== undefined ? (
                                                isFinancialColumn(col) ? formatCurrency(Number(row[col]) || 0, selectedCurrencyCode) : row[col].toLocaleString()
                                              ) : '—'}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ height: '250px', width: '100%', padding: '10px 0', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel)' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    {consoleChartType === 'line' ? (
                                      <LineChart data={mappedConsoleData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isConsoleFinancial ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isConsoleFinancial ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                                        <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                                      </LineChart>
                                    ) : consoleChartType === 'area' ? (
                                      <AreaChart data={mappedConsoleData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isConsoleFinancial ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isConsoleFinancial ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                                        <Area type="monotone" dataKey="value" fill="var(--accent-primary-light)" stroke="var(--accent-primary)" strokeWidth={2} />
                                      </AreaChart>
                                    ) : consoleChartType === 'pie' ? (
                                      <PieChart>
                                        <Pie data={mappedConsoleData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                                          {mappedConsoleData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(val: any) => isConsoleFinancial ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                                        <Legend />
                                      </PieChart>
                                    ) : (
                                      <BarChart data={mappedConsoleData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => isConsoleFinancial ? `${activeCurrencySymbol}${val.toLocaleString()}` : val.toLocaleString()} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(val: any) => isConsoleFinancial ? [`${activeCurrencySymbol}${val.toLocaleString()}`, 'Value'] : [val.toLocaleString(), 'Value']} />
                                        <Bar dataKey="value" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} barSize={35} />
                                      </BarChart>
                                    )}
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Data Table Result Preview card */}
              {vizTab === 'chart' && queryResult.length > 0 && (
                <div className="workspace-panel shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Query Data Table</h4>
                    <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => exportToCSV(queryResult, 'query_data.csv')}>
                      <Download size={12} className="mr-2" /> Download Data Table (CSV)
                    </button>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>{dimension === 'category' ? 'Category Group' : 'SKU Identifier'}</th>
                          <th style={{ textAlign: 'right' }}>Aggregated Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {isFinancialMeasure(measure) ? formatCurrency(row.value, selectedCurrencyCode) : row.value.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* CUSTOM DASHBOARDS TAB */}
        {activeTab === 'dashboards' && (
          <div>
            
            {/* Header toolbar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Custom Dashboard</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aggregate custom queries into interactive sheets.</p>
                </div>
                
                {/* Dashboard Switcher Dropdown & Inline editor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                  {isCreatingDashboard ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="text"
                        placeholder="New Dashboard Name"
                        className="form-control"
                        value={newDashboardNameInput}
                        onChange={e => setNewDashboardNameInput(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', width: '180px' }}
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          const name = newDashboardNameInput.trim();
                          if (!name) return;
                          const newDash: Dashboard = {
                            id: Date.now().toString(),
                            name,
                            widgets: []
                          };
                          const updated = [...dashboards, newDash];
                          setDashboards(updated);
                          localStorage.setItem('planora_bi_dashboards', JSON.stringify(updated));
                          setActiveDashboardId(newDash.id);
                          localStorage.setItem('planora_bi_active_dashboard_id', newDash.id);
                          setIsCreatingDashboard(false);
                          setNewDashboardNameInput('');
                        }}
                      >
                        <Check size={13} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          setIsCreatingDashboard(false);
                          setNewDashboardNameInput('');
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : isRenamingDashboard ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={renameDashboardNameInput}
                        onChange={e => setRenameDashboardNameInput(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', width: '180px' }}
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          const name = renameDashboardNameInput.trim();
                          if (!name) return;
                          const updated = dashboards.map(d => {
                            if (d.id === activeDashboardId) {
                              return { ...d, name };
                            }
                            return d;
                          });
                          setDashboards(updated);
                          localStorage.setItem('planora_bi_dashboards', JSON.stringify(updated));
                          setIsRenamingDashboard(false);
                          setRenameDashboardNameInput('');
                        }}
                      >
                        <Check size={13} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} 
                        onClick={() => {
                          setIsRenamingDashboard(false);
                          setRenameDashboardNameInput('');
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Sheet:</span>
                      <select
                        value={activeDashboardId}
                        onChange={e => {
                          setActiveDashboardId(e.target.value);
                          localStorage.setItem('planora_bi_active_dashboard_id', e.target.value);
                        }}
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '4px 12px', minWidth: '180px' }}
                      >
                        {dashboards.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }} 
                        onClick={() => {
                          setIsCreatingDashboard(true);
                          setNewDashboardNameInput('');
                        }} 
                        title="Create New Blank Dashboard"
                      >
                        <Plus size={12} className="mr-1" /> New
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }} 
                        onClick={() => {
                          const cur = dashboards.find(d => d.id === activeDashboardId);
                          if (cur) {
                            setIsRenamingDashboard(true);
                            setRenameDashboardNameInput(cur.name);
                          }
                        }} 
                        title="Rename Current Dashboard"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        className="btn btn-outline text-red-600" 
                        style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#dc2626' }} 
                        onClick={handleDeleteDashboard} 
                        title="Delete Current Dashboard"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditingLayout(!isEditingLayout)} 
                  className={`btn ${isEditingLayout ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Settings size={13} className="mr-1" />
                  {isEditingLayout ? 'Done Customizing' : 'Customize Layout'}
                </button>
              </div>
            </div>

            {/* Global Filters Panel */}
            <div className="workspace-panel shadow-sm mb-6 bg-gray-50" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-3">
                <ListFilter size={15} color="var(--accent-primary)" />
                <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Global Dashboard Filters</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                
                {/* Category Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Product Category</label>
                  <select 
                    value={globalCategory} 
                    onChange={e => setGlobalCategory(e.target.value)} 
                    className="form-control"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <option value="All">All Categories (Default)</option>
                    {Array.from(new Set(skuDatabase.map(s => s.category))).filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Max Lead Time Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Maximum Lead Time</label>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{globalMaxLeadTime} Days</span>
                  </div>
                  <input 
                    type="range" 
                    min={1} 
                    max={30} 
                    value={globalMaxLeadTime} 
                    onChange={e => setGlobalMaxLeadTime(parseInt(e.target.value))} 
                    className="w-full"
                    style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>

                {/* Stock levels check */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Inventory Health Status</label>
                  <select 
                    value={globalStockLevel} 
                    onChange={e => setGlobalStockLevel(e.target.value as any)} 
                    className="form-control"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <option value="All">All Inventory Positions</option>
                    <option value="Low">Low Stock (On Hand &lt; 20 units)</option>
                    <option value="Out">Out of Stock (Zero Units)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Scorecards Row */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {[
                { label: 'Active SKUs', value: kpis.totalSkus.toLocaleString(), desc: 'Matching active filters', colorClass: 'kpi-blue' },
                { label: 'Total Valuation', value: formatCurrency(kpis.valuation, selectedCurrencyCode), desc: 'Inventory carrying cost', colorClass: 'kpi-green' },
                { label: 'Units On Hand', value: kpis.unitsOnHand.toLocaleString(), desc: 'Total stockpiled volume', colorClass: 'kpi-orange' },
                { label: 'Avg Lead Time', value: `${kpis.avgLeadTime} Days`, desc: 'Average fulfillment duration', colorClass: 'kpi-purple' },
              ].map((kpi, idx) => (
                <div key={idx} className={`kpi-infolet ${kpi.colorClass}`}>
                  <div className="label">{kpi.label}</div>
                  <div className="value">{kpi.value}</div>
                  <div className="subtext">{kpi.desc}</div>
                </div>
              ))}
            </div>

            {/* Dashboard grid panel */}
            {savedQueries.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-panel)' }}>
                <LayoutGrid size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ color: 'var(--text-main)', margin: '0 0 4px', fontSize: '1rem' }}>No Custom Widgets Configured</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 16px' }}>Create and save a query in the Visual Query Builder tab to build your custom sheets.</p>
                <button className="btn btn-primary" onClick={() => {
                  const event = new CustomEvent('set-shell-tab', { detail: 'query' });
                  window.dispatchEvent(event);
                }}>
                  <Plus size={14} className="mr-2" /> Open Visual Query Builder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {savedQueries.map((q, idx) => renderDashboardWidget(q, idx))}
                
                {isEditingLayout && (
                  <div 
                    onClick={() => {
                      const event = new CustomEvent('set-shell-tab', { detail: 'query' });
                      window.dispatchEvent(event);
                    }}
                    className="workspace-panel flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ 
                      height: '350px', 
                      border: '2px dashed var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      backgroundColor: 'rgba(6, 78, 59, 0.02)'
                    }}
                  >
                    <PlusCircle size={32} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>+ Add Custom Widget Card</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}
