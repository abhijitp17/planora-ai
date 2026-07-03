'use client';

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, User, Package, Users, Sliders, Lock, Unlock, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getGovernanceSettings, saveGovernanceSettings } from '@/lib/api';

import { usePlatform } from '@/store/PlatformContext';

export default function AdminGovernancePanel() {
  const { user, hasRole } = useAuth();
  const { state, dispatch } = usePlatform();
  const toast = useToast();
  
  const activeView = ['approvals', 'master', 'workforce', 'rules'].includes(state?.activeTab) 
    ? (state.activeTab as 'approvals' | 'master' | 'workforce' | 'rules') 
    : 'approvals';

  // Governance state
  const [consensusCap, setConsensusCap] = useState(30);
  const [serviceLevelFloor, setServiceLevelFloor] = useState(85);
  const [lockedSkus, setLockedSkus] = useState<string[]>([]);
  const [govLoading, setGovLoading] = useState(false);

  // Load governance settings from backend
  useEffect(() => {
    getGovernanceSettings()
      .then(res => {
        if (res) {
          setConsensusCap(res.consensus_cap_pct || 30);
          setServiceLevelFloor(res.service_level_floor_pct || 85);
          setLockedSkus(res.locked_skus || []);
        }
      })
      .catch(err => {
        console.error('Failed to load governance settings', err);
      });
  }, []);

  if (!hasRole('manager')) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <Shield size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p style={{ color: 'var(--text-muted)' }}>Manager role required to access governance panel.</p>
      </div>
    );
  }

  const pendingApprovals = [
    { id: 1, requester: 'Raj Patel', type: 'Forecast Override', details: 'ELE_TV_85 consensus +15% for Q4', time: '2h ago' },
    { id: 2, requester: 'Sarah Chen', type: 'Inventory Transfer', details: '450 units WH_EAST → WH_WEST', time: '5h ago' },
    { id: 3, requester: 'Raj Patel', type: 'Budget Change', details: 'Increase safety stock budget by $12K', time: '1d ago' },
  ];

  const skuMaster = [
    { sku: 'ELE_PHONE_001', name: 'SmartPhone X1', category: 'Electronics', cost: 350, asp: 799, lt: 31, supplier: 'Asia Sourcing Corp', status: 'Active' },
    { sku: 'ELE_TV_85_OLED', name: '85" OLED Television', category: 'Electronics', cost: 1200, asp: 2499, lt: 45, supplier: 'Samsung Display', status: 'Active' },
    { sku: 'FUR_CHAIR_ERG', name: 'Ergonomic Office Chair', category: 'Furniture', cost: 180, asp: 449, lt: 30, supplier: 'ErgoFlex Mfg', status: 'Active' },
    { sku: 'ACC_MOUSE_WIRELESS', name: 'Wireless Gaming Mouse', category: 'Accessories', cost: 15, asp: 79, lt: 14, supplier: 'Logitech', status: 'Active' },
  ];

  // Workforce Shift Labor data
  const shiftLaborData = [
    { node: 'Production Factory A', type: 'Manufacturing', headcount: 85, utilization: 92.0, overtime: 12.0, status: 'On Target', color: 'var(--status-good)' },
    { node: 'Warehouse East (WH_EAST)', type: 'Distribution Center', headcount: 35, utilization: 96.5, overtime: 24.5, status: 'Critical - Overtime Cap', color: 'var(--status-error)' },
    { node: 'Warehouse West (WH_WEST)', type: 'Distribution Center', headcount: 25, utilization: 84.0, overtime: 4.0, status: 'On Target', color: 'var(--status-good)' },
  ];

  const handleToggleLock = (sku: string) => {
    if (lockedSkus.includes(sku)) {
      setLockedSkus(lockedSkus.filter(s => s !== sku));
    } else {
      setLockedSkus([...lockedSkus, sku]);
    }
  };

  const handleSavePolicies = async () => {
    setGovLoading(true);
    try {
      await saveGovernanceSettings({
        consensus_cap_pct: consensusCap,
        service_level_floor_pct: serviceLevelFloor,
        locked_skus: lockedSkus
      });
      toast.success('Data Governance policies saved successfully.');
    } catch (err: any) {
      toast.error('Failed to save governance settings: ' + err.message);
    } finally {
      setGovLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <Shield size={24} color="var(--accent-primary)" />
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 600 }}>Governance & Master Data</h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Workflow approvals, master data management, workforce intelligence, and policy settings
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { id: 'approvals' as const, label: 'Pending Approvals', icon: <Clock size={14} />, count: 3 },
          { id: 'master' as const, label: 'Master Data', icon: <Package size={14} />, count: skuMaster.length },
          { id: 'workforce' as const, label: 'Workforce Risk', icon: <Users size={14} />, count: 1 },
          { id: 'rules' as const, label: 'Governance Rules', icon: <Sliders size={14} />, count: lockedSkus.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
            style={{
              padding: '8px 16px', borderRadius: '0px', border: '0.5px solid var(--border-color)',
              background: activeView === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeView === tab.id ? '#fff' : 'var(--text-main)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {tab.icon} {tab.label}
            <span style={{
              background: activeView === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)',
              padding: '1px 6px', borderRadius: '0px', fontSize: '0.7rem', fontWeight: 700,
              marginLeft: '4px',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeView === 'approvals' && (
        <div className="workspace-panel shadow-sm">
          <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', fontWeight: 600 }}>Workflow Approvals Queue</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Requester</th><th>Type</th><th>Details</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingApprovals.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="var(--text-muted)" />
                        <span>{req.requester}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{req.type}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '300px' }}>{req.details}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.time}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: '#eaf3de', color: '#16a34a', border: 'none' }}>
                          <CheckCircle size={12} className="mr-1" /> Approve
                        </button>
                        <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: '#fef2f2', color: '#dc2626', border: 'none' }}>
                          <XCircle size={12} className="mr-1" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'master' && (
        <div className="workspace-panel shadow-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>SKU Master Data Registry</h3>
            {hasRole('admin') && (
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Package size={14} className="mr-1" /> Add New SKU
              </button>
            )}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>SKU</th><th>Name</th><th>Category</th><th>Unit Cost</th><th>ASP</th><th>Lead Time</th><th>Supplier</th><th>Status</th></tr>
              </thead>
              <tbody>
                {skuMaster.map(sku => (
                  <tr key={sku.sku}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{sku.sku}</td>
                    <td>{sku.name}</td>
                    <td>{sku.category}</td>
                    <td style={{ textAlign: 'right' }}>${sku.cost.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${sku.asp.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{sku.lt} days</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sku.supplier}</td>
                    <td>
                      <span className="badge" style={{ background: '#eaf3de', color: '#16a34a' }}>{sku.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'workforce' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid grid-cols-3">
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Active S&OP Operators</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--accent-primary)' }}>145 <span style={{ fontSize: '0.8rem', color: 'var(--status-good)' }}>92.0% Util</span></span>
            </div>
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Labor Churn & Volatility</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--status-warn)' }}>14.2% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MoM Churn</span></span>
            </div>
            <div className="kpi-infolet">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Overtime Hour Alarms</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--status-error)' }}>1 Facility <span style={{ fontSize: '0.8rem', color: 'var(--status-error)' }}>WH_EAST</span></span>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#fef2f2', borderLeft: '4px solid #dc2626', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#991b1b' }}>CRITICAL LABOR OVERTIME BREACH: Warehouse East</div>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.5 }}>
                WH_EAST has exceeded the 20% overtime budget cap, clocking 24.5% overtime hours this week. Safety, exhaustion risks, and operating costs are elevated. Planners should rebalance outbound shipments or shift load lines to WH_WEST.
              </p>
            </div>
          </div>

          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', fontWeight: 600 }}>Shift Labor Allocation & Risk Analytics</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Facility Node</th><th>Facility Type</th><th>Active Operators</th><th>Labor Util %</th><th>Overtime %</th><th>Risk Status</th></tr>
                </thead>
                <tbody>
                  {shiftLaborData.map(sl => (
                    <tr key={sl.node}>
                      <td style={{ fontWeight: 600 }}>{sl.node}</td>
                      <td>{sl.type}</td>
                      <td style={{ textAlign: 'right' }}>{sl.headcount}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{sl.utilization}%</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: sl.overtime > 20 ? '#dc2626' : 'inherit' }}>{sl.overtime}%</td>
                      <td>
                        <span className="badge" style={{ background: sl.color + '20', color: sl.color, border: `1.5px solid ${sl.color}`, fontWeight: 700 }}>
                          {sl.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', margin: '0 0 1.25rem', fontWeight: 600 }}>Global Data Governance Threshold Policies</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                  <span>Manual Consensus Override Cap</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>±{consensusCap}%</span>
                </label>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={consensusCap} 
                  onChange={e => setConsensusCap(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Restricts planners from overriding baseline forecasts beyond this percentage threshold to prevent excessive volume volatility.
                </p>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                  <span>Service Level Constraint Target Floor</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{serviceLevelFloor}%</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="99" 
                  value={serviceLevelFloor} 
                  onChange={e => setServiceLevelFloor(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Sets the absolute minimum service level floor for safety stock algorithms to avoid high stockout exposure.
                </p>
              </div>
            </div>
          </div>

          <div className="workspace-panel shadow-sm">
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', fontWeight: 600 }}>SKU Governance Lock Registry</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-0.5rem 0 1.25rem' }}>
              Locked SKUs cannot be edited or overridden by planners. Locks should be applied to high-volatility, critical category items.
            </p>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>SKU</th><th>Name</th><th>Category</th><th>Supplier</th><th>Lock Policy Status</th><th>Toggle Lock</th></tr>
                </thead>
                <tbody>
                  {skuMaster.map(sku => {
                    const isLocked = lockedSkus.includes(sku.sku);
                    return (
                      <tr key={sku.sku}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{sku.sku}</td>
                        <td>{sku.name}</td>
                        <td>{sku.category}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{sku.supplier}</td>
                        <td>
                          {isLocked ? (
                            <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={12} /> Locked (Write Blocked)
                            </span>
                          ) : (
                            <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Unlock size={12} /> Unlocked (Editable)
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleLock(sku.sku)}
                            style={{
                              padding: '5px 10px',
                              background: isLocked ? 'var(--bg-hover)' : 'var(--accent-primary)',
                              color: isLocked ? 'var(--text-main)' : '#fff',
                              border: '0.5px solid var(--border-color)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                            {isLocked ? 'Unlock Override' : 'Lock Override'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              onClick={handleSavePolicies}
              disabled={govLoading}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckCircle size={15} />
              {govLoading ? 'Saving Settings…' : 'Save Governance Policies'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
