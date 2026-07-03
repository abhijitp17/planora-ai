'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { 
  Users, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, Truck, 
  Upload, FileText, Check, Plus, AlertCircle, Sparkles, Building
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { 
  getSupplierForecasts, commitSupplier, uploadAsn, getAsnLedger 
} from '@/lib/api';

const SUPPLIER_OPTIONS = [
  "Asia Sourcing Corp",
  "Summit Parts Supplier",
  "Samsung Display",
  "ErgoFlex Mfg",
  "Logitech"
];

export default function SupplierModule() {
  const { state } = usePlatform();
  const { selectedCurrencyCode } = state;

  const [activeSubTab, setActiveSubTab] = useState<'collaborative' | 'portal' | 'scorecard'>('collaborative');
  
  // Simulation context (acting as Planner or acting as a Supplier)
  const [actingRole, setActingRole] = useState<'planner' | 'supplier'>('planner');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('Asia Sourcing Corp');

  // State lists
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [asnList, setAsnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Input State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [commitValue, setCommitValue] = useState<number>(0);
  const [commitNotes, setCommitNotes] = useState<string>('');

  // ASN upload State
  const [asnNo, setAsnNo] = useState<string>('');
  const [asnSku, setAsnSku] = useState<string>('ELE_PHONE_001');
  const [asnQty, setAsnQty] = useState<number>(500);
  const [showAddAsn, setShowAddAsn] = useState(false);

  const loadData = () => {
    setLoading(true);
    const filterSup = actingRole === 'supplier' ? selectedSupplier : undefined;
    Promise.all([
      getSupplierForecasts(filterSup),
      getAsnLedger(filterSup)
    ]).then(([forecastData, asns]) => {
      setForecasts(forecastData);
      setAsnList(asns);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [actingRole, selectedSupplier]);

  const handleSaveCommit = () => {
    if (!editingItem) return;
    const payload = {
      supplier_name: editingItem.supplier_name,
      sku: editingItem.sku,
      dataset_version: editingItem.month,
      commit_qty: commitValue,
      notes: commitNotes
    };
    commitSupplier(payload).then(() => {
      setEditingItem(null);
      loadData();
    }).catch(console.error);
  };

  const handleCreateAsn = () => {
    if (!asnNo) return;
    const payload = {
      supplier_name: selectedSupplier,
      asn_number: asnNo,
      items: [{ sku: asnSku, qty: asnQty }]
    };
    uploadAsn(payload).then(() => {
      setAsnNo('');
      setShowAddAsn(false);
      loadData();
    }).catch(console.error);
  };

  // Summarize gap metrics
  const totalRequested = forecasts.reduce((acc, curr) => acc + curr.requested_qty, 0);
  const totalCommitted = forecasts.reduce((acc, curr) => acc + curr.committed_qty, 0);
  const totalShortage = totalRequested - totalCommitted;
  const underCommitsCount = forecasts.filter(f => f.status === 'Under Committed').length;

  return (
    <ErrorBoundary>
      <div style={{ padding: '2rem' }}>
        {/* Module Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Supplier Collaboration & Portal</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Share planning requirements with supplier vendors, manage capacity locks, and track advance shipments.
            </p>
          </div>
          
          {/* Simulated Persona Switcher */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-hover)', padding: '6px 12px', border: '0.5px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Persona:</span>
            <select 
              value={actingRole} 
              onChange={e => setActingRole(e.target.value as any)}
              style={{ fontSize: '0.8rem', padding: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}
            >
              <option value="planner">Planner (Consolidated View)</option>
              <option value="supplier">Supplier (Vendor External Portal)</option>
            </select>

            {actingRole === 'supplier' && (
              <select 
                value={selectedSupplier} 
                onChange={e => setSelectedSupplier(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}
              >
                {SUPPLIER_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            
            <button onClick={loadData} className="btn btn-outline" style={{ padding: '3px 8px' }}>
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '2px' }}>
          {[
            { id: 'collaborative', label: 'Collaborative Planning', icon: <Users size={14} /> },
            { id: 'portal', label: 'Supplier Portal / ASN', icon: <Truck size={14} /> },
            { id: 'scorecard', label: 'Supplier Scorecard', icon: <BarChart2 size={14} /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: 'none',
                background: activeSubTab === tab.id ? 'var(--bg-hover)' : 'transparent',
                borderBottom: activeSubTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeSubTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: activeSubTab === tab.id ? 600 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Syncing with Supplier systems...</div>
        ) : (
          <div>
            {/* TABS 1: COLLABORATIVE PLANNING */}
            {activeSubTab === 'collaborative' && (
              <div>
                {/* Shortage Warnings Banner */}
                {underCommitsCount > 0 && (
                  <div style={{ padding: '12px', background: 'var(--status-error-bg)', border: '1px solid var(--status-error)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--status-error)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--status-error)' }}>
                        SUPPLIER CAPACITY SHORTAGE DETECTED
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        There are {underCommitsCount} supply gaps where requested forecast target exceeds supplier confirmed commitments. Total gap: {totalShortage} units.
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistics infolets */}
                <div className="grid grid-cols-4 mb-6">
                  <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requested Total</span><span style={{ fontSize: '1.5rem', fontWeight: 500 }}>{totalRequested}</span></div>
                  <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Committed Total</span><span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--status-good)' }}>{totalCommitted}</span></div>
                  <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Supply Gap</span><span style={{ fontSize: '1.5rem', fontWeight: 500, color: totalShortage > 0 ? 'var(--status-error)' : 'var(--text-muted)' }}>{totalShortage}</span></div>
                  <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gaps Flagged</span><span style={{ fontSize: '1.5rem', fontWeight: 500, color: underCommitsCount > 0 ? 'var(--status-error)' : 'var(--text-muted)' }}>{underCommitsCount}</span></div>
                </div>

                {/* Edit Commit Form Overlay (Inline) */}
                {editingItem && (
                  <div style={{ padding: '12px', background: 'var(--bg-hover)', border: '0.5px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
                      Adjust Commitment: {editingItem.supplier_name} ({editingItem.sku}) for {editingItem.month}
                    </h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requested: {editingItem.requested_qty}</span>
                      <input 
                        type="number" 
                        value={commitValue} 
                        onChange={e => setCommitValue(parseFloat(e.target.value))}
                        style={{ padding: '4px 8px', width: '120px', fontSize: '0.8rem', border: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Commit notes / reason code" 
                      value={commitNotes} 
                      onChange={e => setCommitNotes(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => setEditingItem(null)} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Cancel</button>
                      <button onClick={handleSaveCommit} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>Save Commit</button>
                    </div>
                  </div>
                )}

                {/* Forecast Table */}
                <div className="workspace-panel shadow-sm">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>Supplier</th><th>SKU ID</th><th>Plan Month</th><th>Forecast Req</th><th>Supplier Commit</th><th>Status</th><th>Gap</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {forecasts.map((f, i) => {
                          const gap = f.requested_qty - f.committed_qty;
                          const isFullyCommitted = f.status === 'Fully Committed';
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{f.supplier_name}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{f.sku}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{f.month}</td>
                              <td>{f.requested_qty}</td>
                              <td style={{ fontWeight: 600, color: isFullyCommitted ? 'var(--status-good)' : 'var(--status-error)' }}>{f.committed_qty}</td>
                              <td>
                                <span className="badge" style={{ 
                                  background: isFullyCommitted ? 'var(--status-good-bg)' : 'var(--status-error-bg)',
                                  color: isFullyCommitted ? 'var(--status-good)' : 'var(--status-error)',
                                  border: `1px solid ${isFullyCommitted ? 'var(--status-good)' : 'var(--status-error)'}`
                                }}>
                                  {f.status}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600, color: gap > 0 ? 'var(--status-error)' : 'var(--text-muted)' }}>{gap > 0 ? `+${gap}` : '0'}</td>
                              <td>
                                {actingRole === 'supplier' ? (
                                  <button 
                                    onClick={() => {
                                      setEditingItem(f);
                                      setCommitValue(f.committed_qty);
                                      setCommitNotes('');
                                    }}
                                    className="btn btn-outline" 
                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                  >
                                    Confirm Commit
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>View Only (Planners)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 2: SUPPLIER PORTAL (ASN TRUCKS) */}
            {activeSubTab === 'portal' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Advance Ship Notices (ASN Ledger)</h4>
                  {actingRole === 'supplier' && (
                    <button onClick={() => setShowAddAsn(!showAddAsn)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                      + Dispatch New Shipment (ASN)
                    </button>
                  )}
                </div>

                {showAddAsn && (
                  <div className="workspace-panel shadow-sm mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                    <h5 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>Register ASN Outbound Load</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="ASN Tracking No (e.g. ASN-1092)" 
                        value={asnNo} 
                        onChange={e => setAsnNo(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.8rem' }}
                      />
                      <select 
                        value={asnSku} 
                        onChange={e => setAsnSku(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <option value="ELE_PHONE_001">ELE_PHONE_001</option>
                        <option value="ELE_TV_85_OLED">ELE_TV_85_OLED</option>
                        <option value="FUR_CHAIR_ERG">FUR_CHAIR_ERG</option>
                        <option value="ACC_MOUSE_WIRELESS">ACC_MOUSE_WIRELESS</option>
                      </select>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Shipped Quantity" 
                      value={asnQty} 
                      onChange={e => setAsnQty(parseInt(e.target.value))}
                      className="form-control"
                      style={{ fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => setShowAddAsn(false)} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Cancel</button>
                      <button onClick={handleCreateAsn} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>Transmit ASN</button>
                    </div>
                  </div>
                )}

                <div className="workspace-panel shadow-sm col-span-2">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>ASN Document No</th><th>Supplier</th><th>Dispatched Time</th><th>ETA Target</th><th>Carrier Status</th><th>Shipped Items</th></tr>
                      </thead>
                      <tbody>
                        {asnList.map(asn => (
                          <tr key={asn.asn_number}>
                            <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{asn.asn_number}</td>
                            <td>{asn.supplier_name}</td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(asn.ship_date).toLocaleString()}</td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(asn.estimated_arrival).toLocaleDateString()}</td>
                            <td>
                              <span className="badge" style={{ 
                                background: asn.status === 'Shipped' ? 'var(--accent-primary-light)' : 'var(--status-good-bg)',
                                color: asn.status === 'Shipped' ? 'var(--accent-primary)' : 'var(--status-good)',
                                border: `1px solid ${asn.status === 'Shipped' ? 'var(--accent-primary)' : 'var(--status-good)'}`
                              }}>
                                {asn.status}
                              </span>
                            </td>
                            <td>
                              {asn.items.map((it: any, j: number) => (
                                <div key={j} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {it.sku}: <span style={{ fontWeight: 700 }}>{it.qty} units</span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 3: SUPPLIER SCORECARD */}
            {activeSubTab === 'scorecard' && (
              <div>
                <div className="grid grid-cols-2 gap-6">
                  {/* Performance chart */}
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Supplier OTIF Performance History (On-Time In-Full)</h3>
                    <div style={{ height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { month: 'Jan', otif: 91.0, target: 95.0 },
                          { month: 'Feb', otif: 93.4, target: 95.0 },
                          { month: 'Mar', otif: 94.1, target: 95.0 },
                          { month: 'Apr', otif: 88.2, target: 95.0 },
                          { month: 'May', otif: 91.8, target: 95.0 },
                          { month: 'Jun', otif: 94.8, target: 95.0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                          <YAxis stroke="var(--text-muted)" fontSize={11} domain={[80, 100]} tickLine={false} />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="otif" name="OTIF Delivery %" stroke="var(--accent-primary)" strokeWidth={2} />
                          <Line type="monotone" dataKey="target" name="Contract Target" stroke="var(--status-good)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Supplier Benchmark Table */}
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Supplier Risk & Quality Benchmarking</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr><th>Vendor</th><th>Lead Time σ</th><th>Quality Yield</th><th>Defects Rate</th><th>Risk Class</th></tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Asia Sourcing Corp', sd: '3.1 days', yield: '99.4%', defects: '0.06%', risk: 'Low', color: 'var(--status-good)' },
                            { name: 'Samsung Display', sd: '6.4 days', yield: '98.8%', defects: '0.12%', risk: 'Medium', color: 'var(--status-warn)' },
                            { name: 'Summit Parts Supplier', sd: '14.0 days', yield: '94.2%', defects: '0.58%', risk: 'High', color: 'var(--status-error)' },
                            { name: 'ErgoFlex Mfg', sd: '2.0 days', yield: '99.8%', defects: '0.02%', risk: 'Low', color: 'var(--status-good)' },
                            { name: 'Logitech', sd: '4.5 days', yield: '99.1%', defects: '0.09%', risk: 'Low', color: 'var(--status-good)' },
                          ].map(v => (
                            <tr key={v.name}>
                              <td style={{ fontWeight: 600 }}>{v.name}</td>
                              <td style={{ fontFamily: 'monospace' }}>{v.sd}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.yield}</td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{v.defects}</td>
                              <td>
                                <span className="badge" style={{ 
                                  border: `1px solid ${v.color}`,
                                  color: v.color,
                                  background: 'transparent'
                                }}>
                                  {v.risk}
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
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
