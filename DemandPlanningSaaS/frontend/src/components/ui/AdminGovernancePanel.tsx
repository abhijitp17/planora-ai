'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock, User, Package, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';

export default function AdminGovernancePanel() {
  const { user, hasRole } = useAuth();
  const [activeView, setActiveView] = useState<'approvals' | 'master'>('approvals');

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
    { sku: 'ELE_TV_85_OLED', name: '85" OLED Television', category: 'Electronics', cost: 1200, asp: 2499, lt: 45, supplier: 'Samsung Display', status: 'Active' },
    { sku: 'FUR_CHAIR_ERG', name: 'Ergonomic Office Chair', category: 'Furniture', cost: 180, asp: 449, lt: 30, supplier: 'ErgoFlex Mfg', status: 'Active' },
    { sku: 'ACC_MOUSE_WIRELESS', name: 'Wireless Gaming Mouse', category: 'Accessories', cost: 15, asp: 79, lt: 14, supplier: 'Logitech', status: 'Active' },
  ];

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <Shield size={24} color="var(--accent-primary)" />
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 600 }}>Governance & Master Data</h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Workflow approvals, master data management, system administration
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { id: 'approvals' as const, label: 'Pending Approvals', icon: <Clock size={14} />, count: 3 },
          { id: 'master' as const, label: 'Master Data', icon: <Package size={14} />, count: skuMaster.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '0.5px solid var(--border-color)',
              background: activeView === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeView === tab.id ? '#fff' : 'var(--text-main)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {tab.icon} {tab.label}
            <span style={{
              background: activeView === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)',
              padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
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
    </div>
  );
}
