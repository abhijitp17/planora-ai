import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/store/PlatformContext';
import { NetworkNode, NetworkEdge, Scenario } from '@/types';
import { Network, Plus, Play, GitMerge, AlertCircle, TrendingDown, ArrowRight } from 'lucide-react';

const MOCK_NODES: NetworkNode[] = [
  { id: 'supp-1', label: 'Supplier Alpha (APAC)', type: 'supplier', status: 'normal', location: 'Shenzhen, CN' },
  { id: 'supp-2', label: 'Supplier Beta (EU)', type: 'supplier', status: 'normal', location: 'Berlin, DE' },
  { id: 'dc-west', label: 'DC West Coast', type: 'dc', status: 'normal', capacity: 15000, inventoryValue: 4200000, location: 'Los Angeles, CA' },
  { id: 'dc-east', label: 'DC East Coast', type: 'dc', status: 'warning', capacity: 12000, inventoryValue: 3800000, location: 'Newark, NJ' },
  { id: 'ret-1', label: 'Retail Store 101', type: 'retail', status: 'normal', location: 'San Francisco, CA' },
  { id: 'ret-2', label: 'Retail Store 205', type: 'retail', status: 'critical', location: 'New York, NY' }
];

const MOCK_EDGES: NetworkEdge[] = [
  { id: 'e1', source: 'supp-1', target: 'dc-west', leadTimeDays: 21, status: 'normal' },
  { id: 'e2', source: 'supp-2', target: 'dc-east', leadTimeDays: 14, status: 'normal' },
  { id: 'e3', source: 'dc-west', target: 'ret-1', leadTimeDays: 2, status: 'normal' },
  { id: 'e4', source: 'dc-east', target: 'ret-2', leadTimeDays: 3, status: 'delayed' },
  { id: 'e5', source: 'dc-west', target: 'dc-east', leadTimeDays: 5, status: 'normal' },
];

export default function TwinModule() {
  const { state, dispatch } = usePlatform();
  const { activeTab, networkNodes, networkEdges, scenarios, activeScenarioId } = state;

  // Initialize mock data
  useEffect(() => {
    if (networkNodes.length === 0) {
      dispatch({ type: 'SET_NETWORK_NODES', payload: MOCK_NODES });
      dispatch({ type: 'SET_NETWORK_EDGES', payload: MOCK_EDGES });
    }
  }, [networkNodes.length, dispatch]);

  if (activeTab === 'network') {
    return <NetworkTopology nodes={networkNodes} edges={networkEdges} />;
  }

  if (activeTab === 'scenarios') {
    return <ScenarioSandbox scenarios={scenarios} activeScenarioId={activeScenarioId} dispatch={dispatch} />;
  }

  if (activeTab === 'impact') {
    return <ImpactAnalysis />;
  }

  return null;
}

// ── Network Topology ────────────────────────────────────────────────────────
function NetworkTopology({ nodes, edges }: { nodes: NetworkNode[], edges: NetworkEdge[] }) {
  // A simplistic flex layout mapping nodes since we don't have a canvas library loaded
  const suppliers = nodes.filter(n => n.type === 'supplier');
  const dcs = nodes.filter(n => n.type === 'dc');
  const retail = nodes.filter(n => n.type === 'retail');

  const NodeCard = ({ node }: { node: NetworkNode }) => {
    const isWarn = node.status === 'warning';
    const isCrit = node.status === 'critical';
    const borderCol = isCrit ? 'var(--status-error)' : isWarn ? 'var(--status-warn)' : 'var(--status-good)';
    return (
      <div style={{
        background: 'var(--bg-panel)',
        border: `2px solid ${borderCol}`,
        borderRadius: '8px',
        padding: '16px',
        width: '240px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{node.label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{node.location}</div>
        {node.inventoryValue !== undefined && (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '8px' }}>
            Inv: ${(node.inventoryValue / 1000000).toFixed(1)}M
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card" style={{ padding: '2rem', background: 'var(--bg-panel)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4rem' }}>
        
        {/* Tier 1: Suppliers */}
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          {suppliers.map(n => <NodeCard key={n.id} node={n} />)}
        </div>

        {/* Edges representation */}
        <ArrowRight color="var(--border-color)" size={32} style={{ transform: 'rotate(90deg)' }} />

        {/* Tier 2: DCs */}
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          {dcs.map(n => <NodeCard key={n.id} node={n} />)}
        </div>

        <ArrowRight color="var(--border-color)" size={32} style={{ transform: 'rotate(90deg)' }} />

        {/* Tier 3: Retail */}
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          {retail.map(n => <NodeCard key={n.id} node={n} />)}
        </div>

      </div>
    </div>
  );
}

// ── Scenario Sandbox ───────────────────────────────────────────────────────
function ScenarioSandbox({ scenarios, activeScenarioId, dispatch }: any) {
  const handleCreate = () => {
    const newScen: Scenario = {
      id: `scen-${Date.now()}`,
      name: `Scenario ${scenarios.length + 1}`,
      description: 'Custom Scenario',
      createdAt: new Date().toISOString().split('T')[0],
      overrides: [{ field: 'leadTime', value: 30, edgeId: 'e1' }],
      isActive: false
    };
    dispatch({ type: 'SET_SCENARIOS', payload: [...scenarios, newScen] });
  };

  const handleActivate = (id: string) => {
    const updated = scenarios.map((s: Scenario) => ({ ...s, isActive: s.id === id }));
    dispatch({ type: 'SET_SCENARIOS', payload: updated });
    dispatch({ type: 'SET_ACTIVE_SCENARIO', payload: id });
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Scenario Sandbox</h3>
          <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Plus size={16} /> New Scenario
          </button>
        </div>
        
        {scenarios.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-panel)', borderRadius: '8px' }}>
            No scenarios created.
          </div>
        ) : (
          scenarios.map((s: Scenario) => (
            <div key={s.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: s.isActive ? '2px solid var(--accent-primary)' : undefined }}>
              <div>
                <h4 style={{ margin: '0 0 4px' }}>{s.name}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created {s.createdAt}</div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <span className="badge" style={{ background: 'var(--bg-hover)' }}><GitMerge size={12}/> Overrides: {s.overrides.length}</span>
                </div>
              </div>
              <button 
                className={s.isActive ? "btn btn-primary" : "btn btn-outline"} 
                onClick={() => handleActivate(s.id)}
              >
                {s.isActive ? 'Active' : 'Activate'}
              </button>
            </div>
          ))
        )}
      </div>
      <div style={{ flex: 1 }} className="card">
         <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
           <h4 style={{ margin: 0 }}>Scenario Overrides</h4>
         </div>
         <div style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
           Select a scenario to view its injected shocks and overrides.
         </div>
      </div>
    </div>
  );
}

// ── Impact Analysis ────────────────────────────────────────────────────────
function ImpactAnalysis() {
  const { state } = usePlatform();
  const { activeScenarioId, scenarios } = state;

  const activeScen = scenarios.find(s => s.id === activeScenarioId);

  if (!activeScen) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h3>No Active Scenario</h3>
        <p>Please activate a scenario from the Scenario Sandbox to view impact.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h3>Impact Analysis: {activeScen.name}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Inventory Cost Delta</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-error)', marginTop: '8px' }}>+$1.2M</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Base: $8.0M → Scenario: $9.2M</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service Level Impact</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-warn)', marginTop: '8px' }}>-4.2%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Base: 95.0% → Scenario: 90.8%</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Projected Stockouts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-error)', marginTop: '8px' }}>+12,400 Units</div>
        </div>
      </div>
    </div>
  );
}
