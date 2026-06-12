'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getConnectors, generateExecutionDoc, getApiRegistry, getEventStream } from '@/lib/api';
import {
  ArrowRightLeft, Database, Truck, ShoppingCart, Server, Zap, Download,
  CircleCheck, AlertTriangle, CircleDashed, ArrowDown, ArrowUp, RefreshCw,
} from 'lucide-react';

export default function ExecutionModule() {
  const { state } = usePlatform();
  const { can } = useAuth();
  const { activeTab, selectedDataset } = state;
  const canEdit = can('edit:forecast');

  return (
    <ErrorBoundary moduleName="Execution Systems">
      <div className="container">
        {activeTab === 'connectors' && <ConnectorsView />}
        {activeTab === 'documents' && <DocumentsView dataset={selectedDataset} canEdit={canEdit} />}
        {activeTab === 'apis' && <ApiRegistryView />}
        {activeTab === 'events' && <EventStreamView />}
      </div>
    </ErrorBoundary>
  );
}

// ── Connectors ────────────────────────────────────────────────────────────────
function ConnectorsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConnectors().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const typeIcons: Record<string, any> = { ERP: Database, WMS: Server, TMS: Truck, Procurement: ShoppingCart };
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    connected: { color: 'var(--status-good)', icon: CircleCheck, label: 'Connected' },
    degraded: { color: 'var(--status-warn)', icon: AlertTriangle, label: 'Degraded' },
    configured: { color: 'var(--text-muted)', icon: CircleDashed, label: 'Configured' },
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading connectors…</div>;
  if (!data?.connectors) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load connectors.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Integration Connectors</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Live connection health across ERP, WMS, TMS, and Procurement systems.
        </p>
      </div>

      <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Connectors shown reflect a representative integration landscape. Live connections are configured per deployment.
      </div>

      <div className="grid grid-cols-4 mb-6">
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Connected</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-good)' }}>{data.summary.connected}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/{data.summary.total}</span></span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Degraded</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-warn)' }}>{data.summary.degraded}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Configured</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-muted)' }}>{data.summary.configured}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Avg Health</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{data.summary.avg_health}%</span></div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {data.connectors.map((c: any) => {
          const Icon = typeIcons[c.type] || Database;
          const sc = statusConfig[c.status];
          const StatusIcon = sc.icon;
          return (
            <div key={c.id} className="workspace-panel shadow-sm" style={{ borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.type} · {c.protocol}</div>
                  </div>
                </div>
                <span className="badge" style={{ background: sc.color + '20', color: sc.color, border: `1px solid ${sc.color}`, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <StatusIcon size={11} /> {sc.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Direction:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.direction}</span></div>
                {c.health > 0 && <div><span style={{ color: 'var(--text-muted)' }}>Health:</span> <span style={{ fontWeight: 600, color: c.health > 95 ? 'var(--status-good)' : 'var(--status-warn)' }}>{c.health}%</span></div>}
                <div><span style={{ color: 'var(--text-muted)' }}>Last sync:</span> <span style={{ fontWeight: 600 }}>{c.last_sync ? new Date(c.last_sync).toLocaleTimeString() : '—'}</span></div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {c.objects.map((o: string) => (
                  <span key={o} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{o}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Outbound Documents ────────────────────────────────────────────────────────
function DocumentsView({ dataset, canEdit }: { dataset: string; canEdit: boolean }) {
  const [docType, setDocType] = useState('purchase_order');
  const [targetSystem, setTargetSystem] = useState('SAP');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const docTypes = [
    { id: 'purchase_order', label: 'Purchase Order', icon: ShoppingCart, edi: 'EDI 850' },
    { id: 'asn', label: 'Advance Ship Notice', icon: Truck, edi: 'EDI 856' },
    { id: 'load_tender', label: 'Load Tender', icon: Truck, edi: 'EDI 204' },
    { id: 'transfer_order', label: 'Transfer Order', icon: ArrowRightLeft, edi: 'STO' },
  ];

  const generate = () => {
    setLoading(true);
    generateExecutionDoc(docType, targetSystem, dataset)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const download = () => {
    if (!data?.flat_file) return;
    const blob = new Blob([data.flat_file], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = data.filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Outbound Execution Documents</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Generate execution documents in standard ERP/EDI formats, ready to transmit to connected systems.
        </p>
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
          {docTypes.map(dt => {
            const Icon = dt.icon;
            return (
              <button key={dt.id} onClick={() => setDocType(dt.id)} style={{
                padding: '14px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                border: docType === dt.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: docType === dt.id ? 'var(--accent-primary-light)' : 'var(--bg-panel)',
              }}>
                <Icon size={18} color={docType === dt.id ? 'var(--accent-primary)' : 'var(--text-muted)'} style={{ marginBottom: '6px' }} />
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: docType === dt.id ? 'var(--accent-primary)' : 'var(--text-main)' }}>{dt.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{dt.edi}</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target System
            <select value={targetSystem} onChange={e => setTargetSystem(e.target.value)} className="form-control" style={{ marginLeft: '8px', width: '140px', display: 'inline-block', fontSize: '0.82rem' }}>
              <option value="SAP">SAP S/4HANA</option>
              <option value="Oracle">Oracle Fusion</option>
              <option value="Manhattan">Manhattan WMS</option>
              <option value="Coupa">Coupa</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={!canEdit || loading} onClick={generate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} /> {loading ? 'Generating…' : 'Generate Document'}
          </button>
        </div>
      </div>

      {data?.lines && (
        <div className="workspace-panel shadow-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>{data.doc_id}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{data.edi_standard} → {data.target_system} · {data.line_count} lines</p>
            </div>
            <button className="btn btn-outline" onClick={download} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Download
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>{Object.keys(data.lines[0]).map((k: string) => <th key={k} style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</th>)}</tr>
              </thead>
              <tbody>
                {data.lines.map((line: any, i: number) => (
                  <tr key={i}>
                    {Object.values(line).map((v: any, j: number) => <td key={j} style={{ fontSize: '0.82rem', fontFamily: j === 0 ? 'monospace' : 'inherit' }}>{String(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── API & Webhooks ────────────────────────────────────────────────────────────
function ApiRegistryView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApiRegistry().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading API registry…</div>;
  if (!data?.apis) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load registry.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Real-Time APIs & Webhooks</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Outbound APIs the platform exposes and inbound webhooks it consumes for real-time data exchange.
        </p>
      </div>

      <div className="grid grid-cols-3 mb-6">
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Outbound APIs</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{data.summary.outbound}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Inbound Webhooks</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: '#7c3aed' }}>{data.summary.webhooks}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Avg Latency</span><span style={{ fontSize: '1.4rem', fontWeight: 300 }}>{data.summary.avg_latency_ms}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> ms</span></span></div>
      </div>

      <div className="workspace-panel shadow-sm">
        <div className="table-container">
          <table>
            <thead><tr><th>Endpoint</th><th>Method</th><th>Type</th><th>Consumers</th><th>Rate Limit</th><th>Latency</th><th>Status</th></tr></thead>
            <tbody>
              {data.apis.map((a: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{a.endpoint}</td>
                  <td><span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.7rem' }}>{a.method}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {a.type.includes('Webhook') ? <ArrowDown size={12} color="#7c3aed" /> : <ArrowUp size={12} color="var(--accent-primary)" />}
                      {a.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.consumers.join(', ')}</td>
                  <td style={{ fontSize: '0.78rem' }}>{a.rate_limit}</td>
                  <td style={{ fontSize: '0.78rem', textAlign: 'right' }}>{a.avg_latency_ms} ms</td>
                  <td><span className="badge" style={{ background: 'var(--status-good)20', color: 'var(--status-good)' }}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Event Stream ──────────────────────────────────────────────────────────────
function EventStreamView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getEventStream(25).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const statusColors: Record<string, string> = { success: 'var(--status-good)', retry: 'var(--status-warn)', failed: 'var(--status-error)' };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading event stream…</div>;
  if (!data?.events) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Unable to load events.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Integration Event Stream</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Live ledger of messages flowing between the platform and execution systems.
          </p>
        </div>
        <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 mb-6">
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Events</span><span style={{ fontSize: '1.4rem', fontWeight: 300 }}>{data.summary.total}</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Success Rate</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-good)' }}>{data.summary.success_rate}%</span></div>
        <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Retries</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.summary.retries > 0 ? 'var(--status-warn)' : 'var(--text-muted)' }}>{data.summary.retries}</span></div>
      </div>

      <div className="workspace-panel shadow-sm">
        <div className="table-container">
          <table>
            <thead><tr><th>Time</th><th>Event</th><th>Source</th><th></th><th>Target</th><th>Latency</th><th>Status</th></tr></thead>
            <tbody>
              {data.events.map((e: any) => (
                <tr key={e.event_id}>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{e.event_type}</td>
                  <td style={{ fontSize: '0.8rem' }}>{e.source}</td>
                  <td style={{ textAlign: 'center' }}>{e.direction === 'inbound' ? <ArrowDown size={13} color="#7c3aed" /> : <ArrowUp size={13} color="var(--accent-primary)" />}</td>
                  <td style={{ fontSize: '0.8rem' }}>{e.target}</td>
                  <td style={{ fontSize: '0.78rem', textAlign: 'right' }}>{e.latency_ms} ms</td>
                  <td><span className="badge" style={{ background: statusColors[e.status] + '20', color: statusColors[e.status], textTransform: 'capitalize' }}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
