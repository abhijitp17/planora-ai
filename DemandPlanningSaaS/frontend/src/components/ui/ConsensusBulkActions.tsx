'use client';

import React, { useState } from 'react';
import { Copy, FileSpreadsheet, Calculator, Upload, X } from 'lucide-react';

interface BulkActionsProps {
  consensusAdjustments: Record<string, number>;
  forecastPeriods: string[];
  onUpdate: (adjustments: Record<string, number>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ConsensusBulkActions({ 
  consensusAdjustments, 
  forecastPeriods, 
  onUpdate, 
  isOpen, 
  onClose 
}: BulkActionsProps) {
  const [action, setAction] = useState<'all' | 'formula' | 'copy' | 'import'>('all');
  const [value, setValue] = useState('');
  const [formula, setFormula] = useState('+5'); // e.g., +5, -3, *1.1

  if (!isOpen) return null;

  const applyToAll = () => {
    const val = parseFloat(value) || 0;
    const updated: Record<string, number> = {};
    forecastPeriods.forEach(p => { updated[p] = val; });
    onUpdate(updated);
    onClose();
  };

  const applyFormula = () => {
    const updated = { ...consensusAdjustments };
    const isMultiplier = formula.includes('*');
    const isCumulative = formula.startsWith('+') || formula.startsWith('-');
    
    forecastPeriods.forEach((p, i) => {
      if (isMultiplier) {
        const mult = parseFloat(formula.replace('*', ''));
        updated[p] = (updated[p] || 0) * mult;
      } else if (isCumulative) {
        // Progressive: +5 → period 1: +5%, period 2: +10%, etc.
        const step = parseFloat(formula);
        updated[p] = step * (i + 1);
      } else {
        updated[p] = parseFloat(formula) || 0;
      }
    });
    onUpdate(updated);
    onClose();
  };

  const copyFromPrevious = () => {
    if (forecastPeriods.length < 2) return;
    const firstPeriod = forecastPeriods[0];
    const firstValue = consensusAdjustments[firstPeriod] || 0;
    const updated: Record<string, number> = {};
    forecastPeriods.forEach(p => { updated[p] = firstValue; });
    onUpdate(updated);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: 'var(--bg-panel)', borderRadius: '10px',
        border: '1px solid var(--border-color)', padding: '1.5rem', width: '480px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Bulk Consensus Actions</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all' as const, label: 'Apply to All', icon: <Copy size={14} /> },
            { id: 'formula' as const, label: 'Apply Formula', icon: <Calculator size={14} /> },
            { id: 'copy' as const, label: 'Copy First Period', icon: <Copy size={14} /> },
            { id: 'import' as const, label: 'Import Excel', icon: <FileSpreadsheet size={14} /> },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setAction(opt.id)}
              style={{
                padding: '8px 14px', borderRadius: '6px',
                border: action === opt.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: action === opt.id ? 'var(--accent-primary-light)' : 'transparent',
                color: action === opt.id ? 'var(--accent-primary)' : 'var(--text-main)',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {action === 'all' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
              Adjustment % (applies to all {forecastPeriods.length} periods)
            </label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g., +15 or -10"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)',
                borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem',
              }}
            />
            <button onClick={applyToAll} className="btn btn-primary" style={{ width: '100%' }}>
              Apply to All Periods
            </button>
          </div>
        )}

        {action === 'formula' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
              Formula (progressive adjustment)
            </label>
            <input
              type="text"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              placeholder="e.g., +5 (cumulative), *1.1 (multiplier)"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Examples: <code>+5</code> → P1: +5%, P2: +10%, P3: +15%<br/>
              <code>*1.1</code> → Multiply all by 1.1
            </div>
            <button onClick={applyFormula} className="btn btn-primary" style={{ width: '100%' }}>
              Apply Formula
            </button>
          </div>
        )}

        {action === 'copy' && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Copy the adjustment from the first period ({forecastPeriods[0]}: {consensusAdjustments[forecastPeriods[0]] || 0}%) to all future periods.
            </p>
            <button onClick={copyFromPrevious} className="btn btn-primary" style={{ width: '100%' }}>
              Copy to All Periods
            </button>
          </div>
        )}

        {action === 'import' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <FileSpreadsheet size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload Excel file with columns: Period, Adjustment%
            </p>
            <button className="btn btn-outline">
              <Upload size={14} className="mr-1" /> Select Excel File
            </button>
          </div>
        )}
      </div>
    </>
  );
}
