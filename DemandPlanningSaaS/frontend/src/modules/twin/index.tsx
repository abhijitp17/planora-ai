'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { useAuth } from '@/store/AuthContext';
import type { NetworkNode, NetworkEdge, Scenario } from '@/types';
import { Network, Plus, Play, GitMerge, AlertCircle, TrendingDown, ArrowRight, Zap, BarChart3, RefreshCw } from 'lucide-react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, ReferenceLine, Cell } from 'recharts';
import { runDemandShock, runMonteCarlo } from '@/lib/api';

export default function TwinModule() {
  const { state, dispatch } = usePlatform();
  const { can } = useAuth();
  const { activeTab, skuDatabase, selectedSkuId } = state;
  
  // Build network from real platform data
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkEdges, setNetworkEdges] = useState<NetworkEdge[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Initialize network from SKU database
  useEffect(() => {
    if (networkNodes.length === 0 && skuDatabase.length > 0) {
      // Build realistic network from actual data
      const nodes: NetworkNode[] = [
        { id: 'supp-apac', label: 'Supplier APAC', type: 'supplier', status: 'normal', location: 'Shenzhen, CN' },
        { id: 'supp-eu', label: 'Supplier EU', type: 'supplier', status: 'normal', location: 'Berlin, DE' },
        { id: 'dc-west', label: 'DC West', type: 'dc', status: 'normal', capacity: 15000, inventoryValue: skuDatabase.reduce((a,s)=>a+s.onHand*s.unitCost, 0)/2, location: 'Los Angeles' },
        { id: 'dc-east', label: 'DC East', type: 'dc', status: 'warning', capacity: 12000, inventoryValue: skuDatabase.reduce((a,s)=>a+s.onHand*s.unitCost, 0)/2, location: 'Newark' },
        { id: 'retail-sf', label: 'Store SF', type: 'retail', status: 'normal', location: 'San Francisco' },
        { id: 'retail-ny', label: 'Store NYC', type: 'retail', status: 'critical', location: 'New York' },
      ];
      const edges: NetworkEdge[] = [
        { id: 'e1', source: 'supp-apac', target: 'dc-west', leadTimeDays: 21, status: 'normal' },
        { id: 'e2', source: 'supp-eu', target: 'dc-east', leadTimeDays: 14, status: 'normal' },
        { id: 'e3', source: 'dc-west', target: 'retail-sf', leadTimeDays: 2, status: 'normal' },
        { id: 'e4', source: 'dc-east', target: 'retail-ny', leadTimeDays: 3, status: 'delayed' },
        { id: 'e5', source: 'dc-west', target: 'dc-east', leadTimeDays: 5, status: 'normal' },
      ];
      setNetworkNodes(nodes);
      setNetworkEdges(edges);
    }
  }, [skuDatabase, networkNodes.length]);

  const runScenarioSimulation = useCallback(async (scenario: Scenario) => {
    setIsSimulating(true);
    try {
      const res = await fetch('http://localhost:8000/api/twin/simulate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenario.id,
          baseline_network: { nodes: networkNodes, edges: networkEdges },
          overrides: scenario.overrides,
        }),
      });
      const data = await res.json();
      setSimulationResults(data.metrics);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [networkNodes, networkEdges]);

  if (activeTab === 'network') {
    return <ErrorBoundary moduleName="Network Topology"><NetworkTopologyFlow nodes={networkNodes} edges={networkEdges} /></ErrorBoundary>;
  }

  if (activeTab === 'scenarios') {
    return <ErrorBoundary moduleName="Scenario Sandbox"><ScenarioSandbox scenarios={scenarios} setScenarios={setScenarios} activeScenarioId={activeScenarioId} setActiveScenarioId={setActiveScenarioId} runSimulation={runScenarioSimulation} canEdit={can('edit:forecast')} /></ErrorBoundary>;
  }

  if (activeTab === 'impact') {
    return <ErrorBoundary moduleName="Impact Analysis"><ImpactAnalysis simulationResults={simulationResults} isSimulating={isSimulating} activeScenario={scenarios.find(s => s.id === activeScenarioId)} /></ErrorBoundary>;
  }

  if (activeTab === 'shock') {
    return <ErrorBoundary moduleName="Demand Shock"><DemandShockView selectedDataset={state.selectedDataset} canEdit={can('edit:forecast')} /></ErrorBoundary>;
  }

  if (activeTab === 'montecarlo') {
    return <ErrorBoundary moduleName="Monte Carlo Risk"><MonteCarloView selectedDataset={state.selectedDataset} canEdit={can('edit:forecast')} /></ErrorBoundary>;
  }

  return null;
}

// ── Network Topology with React Flow ──────────────────────────────────────────

// ── Network Topology with React Flow ─────────────────────────────────────────
function NetworkTopologyFlow({ nodes, edges }: { nodes: NetworkNode[], edges: NetworkEdge[] }) {
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const flowNodes: Node[] = nodes.map((n, i) => {
      const tier = n.type === 'supplier' ? 0 : n.type === 'dc' ? 1 : 2;
      const tierNodes = nodes.filter(node => (node.type === 'supplier' ? 0 : node.type === 'dc' ? 1 : 2) === tier);
      const xOffset = tierNodes.findIndex(node => node.id === n.id);
      
      return {
        id: n.id,
        type: 'default',
        position: { x: xOffset * 320 + 100, y: tier * 220 + 50 },
        data: { 
          label: (
            <div style={{ padding: '14px', minWidth: '200px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px', color: '#1f2937' }}>{n.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>{n.location}</div>
              {n.capacity && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Capacity: {n.capacity.toLocaleString()}</div>}
              {n.inventoryValue && <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '6px', color: '#064e3b' }}>${(n.inventoryValue/1000000).toFixed(2)}M</div>}
            </div>
          )
        },
        style: {
          background: '#ffffff',
          border: `3px solid ${n.status === 'critical' ? '#dc2626' : n.status === 'warning' ? '#d97706' : '#16a34a'}`,
          borderRadius: '10px',
          padding: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });

    const flowEdges: Edge[] = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${e.leadTimeDays} days`,
      animated: e.status === 'delayed',
      style: { stroke: e.status === 'delayed' ? '#dc2626' : e.status === 'blocked' ? '#a1a1aa' : '#64748b', strokeWidth: 3 },
      labelStyle: { fontSize: 12, fontWeight: 600, fill: '#1f2937', background: '#fff', padding: '2px 6px', borderRadius: '4px' },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: '#fff' },
    }));

    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [nodes, edges]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Supply Network Digital Twin</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge" style={{ background: '#eaf3de', color: '#16a34a' }}><Network size={10} style={{ marginRight: '3px', verticalAlign: '-1px' }} /> {nodes.length} nodes</span>
          <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>{edges.length} connections</span>
        </div>
      </div>
      <div style={{ height: '560px', background: '#fafafa', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap nodeColor={(n: any) => {
            const border = n.style?.border || '';
            if (border.includes('dc2626')) return '#dc2626';
            if (border.includes('d97706')) return '#d97706';
            return '#16a34a';
          }} />
        </ReactFlow>
      </div>
    </div>
  );
}

// ── Scenario Sandbox ─────────────────────────────────────────────────────────
function ScenarioSandbox({ scenarios, setScenarios, activeScenarioId, setActiveScenarioId, runSimulation, canEdit }: any) {
  const TEMPLATES = [
    { name: 'Supply Disruption', desc: 'Supplier capacity -40%', overrides: [{ nodeId: 'supp-apac', field: 'capacity', value: 0.6 }] },
    { name: 'Lead Time Delay', desc: '+14 days from APAC', overrides: [{ edgeId: 'e1', field: 'leadTimeDays', value: 35 }] },
    { name: 'Demand Spike', desc: '+25% demand surge', overrides: [{ nodeId: 'dc-west', field: 'demandMultiplier', value: 1.25 }] },
  ];

  const createFromTemplate = (tmpl: typeof TEMPLATES[0]) => {
    const newScen: Scenario = {
      id: `scen-${Date.now()}`,
      name: tmpl.name,
      description: tmpl.desc,
      createdAt: new Date().toISOString().split('T')[0],
      overrides: tmpl.overrides,
      isActive: false,
    };
    setScenarios([...scenarios, newScen]);
  };

  const handleActivate = (id: string) => {
    const updated = scenarios.map((s: Scenario) => ({ ...s, isActive: s.id === id }));
    setScenarios(updated);
    setActiveScenarioId(id);
    const activeScen = scenarios.find((s: Scenario) => s.id === id);
    if (activeScen) runSimulation(activeScen);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Scenario Library</h3>
      </div>
      
      {scenarios.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
          <GitMerge size={40} style={{ margin: '0 auto 1.5rem', opacity: 0.5, color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Start with a scenario template:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.name}
                onClick={() => createFromTemplate(tmpl)}
                disabled={!canEdit}
                className="btn btn-outline"
                style={{ padding: '16px', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>{tmpl.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{tmpl.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scenarios.map((s: Scenario) => (
            <div key={s.id} style={{ padding: '1.25rem', background: 'var(--color-background-primary)', border: s.isActive ? '2px solid var(--accent-primary)' : '0.5px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Created {s.createdAt}</div>
                </div>
                <button 
                  className={s.isActive ? "btn btn-primary" : "btn btn-outline"}
                  onClick={() => handleActivate(s.id)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  {s.isActive ? 'Active' : 'Run'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Impact Analysis with Real Simulation Results ─────────────────────────────
function ImpactAnalysis({ simulationResults, isSimulating, activeScenario }: any) {
  if (!activeScenario) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h3>No Active Scenario</h3>
        <p>Activate a scenario from the Scenario Sandbox to view impact analysis.</p>
      </div>
    );
  }

  if (isSimulating) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spin" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Running scenario simulation...</p>
      </div>
    );
  }

  if (!simulationResults) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Click "Run" on a scenario to see impact analysis.</div>;
  }

  const { baseline, scenario, delta } = simulationResults;

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
        Impact Analysis: {activeScenario.name}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Inventory Cost Delta', value: `$${(delta.inventory_cost/1000000).toFixed(2)}M`, base: `$${(baseline.inventory_cost/1000000).toFixed(1)}M`, scen: `$${(scenario.inventory_cost/1000000).toFixed(1)}M`, color: delta.inventory_cost > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Service Level Impact', value: `${(delta.service_level * 100).toFixed(1)}%`, base: `${(baseline.service_level * 100).toFixed(1)}%`, scen: `${(scenario.service_level * 100).toFixed(1)}%`, color: delta.service_level < 0 ? '#dc2626' : '#16a34a' },
          { label: 'Projected Stockouts', value: `${delta.stockouts > 0 ? '+' : ''}${delta.stockouts.toLocaleString()}`, base: '0', scen: scenario.stockouts.toLocaleString(), color: '#dc2626' },
        ].map(metric => (
          <div key={metric.label} className="kpi-infolet" style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--border-color)', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>{metric.label}</span>
            <span style={{ fontSize: '2rem', fontWeight: 500, color: metric.color, display: 'block', marginBottom: '0.5rem' }}>{metric.value}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base: {metric.base} → {metric.scen}</span>
          </div>
        ))}
      </div>

      <div className="workspace-panel shadow-sm">
        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Comparison: Baseline vs Scenario</h4>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { metric: 'Inventory Cost ($M)', Baseline: baseline.inventory_cost/1000000, Scenario: scenario.inventory_cost/1000000 },
              { metric: 'Service Level (%)', Baseline: baseline.service_level * 100, Scenario: scenario.service_level * 100 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
              <Legend />
              <Bar dataKey="Baseline" fill="#64748b" radius={[4,4,0,0]} />
              <Bar dataKey="Scenario" fill="var(--accent-primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMAND SHOCK SIMULATION — ripple propagation & bullwhip
// ═══════════════════════════════════════════════════════════════════════════════
function DemandShockView({ selectedDataset, canEdit }: { selectedDataset: string; canEdit: boolean }) {
  const [shockType, setShockType] = useState('spike');
  const [shockPct, setShockPct] = useState(30);
  const [duration, setDuration] = useState(4);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    runDemandShock(selectedDataset, shockPct, shockType, duration, 12)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedDataset, shockType, shockPct, duration]);

  const shockTypes = [
    { id: 'spike', label: 'Demand Spike', desc: 'Sudden surge' },
    { id: 'drop', label: 'Demand Drop', desc: 'Sudden decline' },
    { id: 'sustained', label: 'Sustained Shift', desc: 'Permanent step change' },
    { id: 'pulse', label: 'One-Week Pulse', desc: 'Single-week burst' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Demand Shock Simulation</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Inject a demand shock and watch it ripple through inventory, fill rate, and replenishment over 12 weeks — including the bullwhip effect.
        </p>
      </div>

      {/* Controls */}
      <div className="workspace-panel shadow-sm mb-6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
          {shockTypes.map(st => (
            <button key={st.id} disabled={!canEdit} onClick={() => setShockType(st.id)} style={{
              padding: '12px', borderRadius: '8px', textAlign: 'left', cursor: canEdit ? 'pointer' : 'not-allowed',
              border: shockType === st.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: shockType === st.id ? 'var(--accent-primary-light)' : 'var(--bg-panel)',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: shockType === st.id ? 'var(--accent-primary)' : 'var(--text-main)' }}>{st.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{st.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Magnitude
            <input type="range" min="10" max="100" step="5" value={shockPct} disabled={!canEdit} onChange={e => setShockPct(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '160px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--accent-primary)' }}>{shockPct}%</span>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Duration
            <input type="range" min="1" max="8" value={duration} disabled={!canEdit} onChange={e => setDuration(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '120px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--text-main)' }}>{duration} wks</span>
          </label>
        </div>
      </div>

      {loading || !data?.summary ? <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Running simulation…</div> : (
        <>
          <div className="grid grid-cols-4 mb-6">
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Min Fill Rate</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.summary.min_fill_rate >= 95 ? 'var(--status-good)' : data.summary.min_fill_rate >= 80 ? 'var(--status-warn)' : 'var(--status-error)' }}>{data.summary.min_fill_rate}%</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Total Stockout</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-error)' }}>{data.summary.total_stockout_units.toLocaleString()}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> units</span></span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Bullwhip Ratio</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: data.summary.bullwhip_ratio > 2 ? 'var(--status-warn)' : 'var(--text-main)' }}>{data.summary.bullwhip_ratio}×</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Recovery Week</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{data.summary.recovery_week ? `W${data.summary.recovery_week}` : 'N/A'}</span></div>
          </div>

          <div className="workspace-panel shadow-sm mb-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Demand vs Inventory vs Orders (Bullwhip)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data.weeks} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={(w) => `W${w}`} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                <Legend />
                <Area type="monotone" dataKey="inventory" fill="var(--accent-primary)" fillOpacity={0.12} stroke="var(--accent-primary)" strokeWidth={2} name="Inventory" />
                <Line type="monotone" dataKey="demand" stroke="var(--status-error)" strokeWidth={2} name="Demand" dot={false} />
                <Line type="monotone" dataKey="order_placed" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" name="Orders Placed" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Weekly Fill Rate</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.weeks} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={(w) => `W${w}`} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} formatter={(v: any) => `${v}%`} />
                <ReferenceLine y={95} stroke="var(--status-good)" strokeDasharray="3 3" />
                <Bar dataKey="fill_rate" radius={[3,3,0,0]} name="Fill Rate %">
                  {data.weeks.map((w: any, i: number) => <Cell key={i} fill={w.fill_rate >= 95 ? 'var(--status-good)' : w.fill_rate >= 80 ? 'var(--status-warn)' : 'var(--status-error)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTE CARLO RISK SIMULATION — probability distributions
// ═══════════════════════════════════════════════════════════════════════════════
function MonteCarloView({ selectedDataset, canEdit }: { selectedDataset: string; canEdit: boolean }) {
  const [iterations, setIterations] = useState(1000);
  const [demandCv, setDemandCv] = useState(0.25);
  const [leadCv, setLeadCv] = useState(0.30);
  const [serviceTarget, setServiceTarget] = useState(95);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    runMonteCarlo(selectedDataset, iterations, demandCv, leadCv, serviceTarget)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedDataset, iterations, demandCv, leadCv, serviceTarget]);

  const riskColors: Record<string, string> = { Low: 'var(--status-good)', Medium: 'var(--status-warn)', High: 'var(--status-error)' };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--text-main)' }}>Monte Carlo Risk Simulation</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Run thousands of iterations with randomized demand and lead time to quantify stockout probability and the service-level distribution.
        </p>
      </div>

      <div className="workspace-panel shadow-sm mb-6">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Iterations
            <select value={iterations} disabled={!canEdit} onChange={e => setIterations(Number(e.target.value))} className="form-control" style={{ marginLeft: '8px', width: '110px', display: 'inline-block', fontSize: '0.82rem' }}>
              <option value={500}>500</option><option value={1000}>1,000</option><option value={5000}>5,000</option><option value={10000}>10,000</option>
            </select>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Demand CV
            <input type="range" min="0.05" max="0.6" step="0.05" value={demandCv} disabled={!canEdit} onChange={e => setDemandCv(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '120px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--accent-primary)' }}>{demandCv.toFixed(2)}</span>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Lead-Time CV
            <input type="range" min="0.05" max="0.6" step="0.05" value={leadCv} disabled={!canEdit} onChange={e => setLeadCv(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '120px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--accent-primary)' }}>{leadCv.toFixed(2)}</span>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Service Target
            <input type="range" min="80" max="99" value={serviceTarget} disabled={!canEdit} onChange={e => setServiceTarget(Number(e.target.value))} style={{ marginLeft: '10px', verticalAlign: 'middle', width: '120px' }} />
            <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--text-main)' }}>{serviceTarget}%</span>
          </label>
        </div>
      </div>

      {loading || !data?.results ? <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Running {iterations.toLocaleString()} iterations…</div> : (
        <>
          <div className="grid grid-cols-4 mb-6">
            <div className="kpi-infolet" style={{ border: `1px solid ${riskColors[data.risk_rating]}` }}><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Stockout Probability</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: riskColors[data.risk_rating] }}>{data.results.stockout_probability}%</span><span style={{ fontSize: '0.68rem', color: riskColors[data.risk_rating], marginTop: '0.4rem', fontWeight: 600 }}>{data.risk_rating} risk</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Expected Service</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{data.results.expected_service_level}%</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Service P5 (worst case)</span><span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--status-warn)' }}>{data.results.service_p5}%</span></div>
            <div className="kpi-infolet"><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Safety Stock</span><span style={{ fontSize: '1.4rem', fontWeight: 300 }}>{data.safety_stock.toLocaleString()}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Service Level Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.service_histogram} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="var(--text-muted)" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                  <Bar dataKey="count" fill="var(--accent-primary)" radius={[3,3,0,0]} name="Iterations" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="workspace-panel shadow-sm">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Percentile Outcomes</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Percentile</th><th>Service Level</th><th>Ending Inventory</th></tr></thead>
                  <tbody>
                    <tr><td style={{ fontWeight: 600 }}>P5 (pessimistic)</td><td style={{ textAlign: 'right', color: 'var(--status-warn)' }}>{data.results.service_p5}%</td><td style={{ textAlign: 'right' }}>{data.results.inventory_p5.toLocaleString()}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>P50 (median)</td><td style={{ textAlign: 'right' }}>{data.results.service_p50}%</td><td style={{ textAlign: 'right' }}>{data.results.inventory_p50.toLocaleString()}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>P95 (optimistic)</td><td style={{ textAlign: 'right', color: 'var(--status-good)' }}>{data.results.service_p95}%</td><td style={{ textAlign: 'right' }}>{data.results.inventory_p95.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="ai-panel mt-4">
                <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><Zap size={16} className="mr-2" color="var(--accent-primary)"/> Risk Assessment</strong>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Across {data.iterations.toLocaleString()} scenarios, stockout probability is {data.results.stockout_probability}% ({data.risk_rating.toLowerCase()} risk). Even in the worst 5% of outcomes, service holds at {data.results.service_p5}%. Average inventory value at risk: {Math.round(data.results.avg_inventory_value).toLocaleString()}.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
