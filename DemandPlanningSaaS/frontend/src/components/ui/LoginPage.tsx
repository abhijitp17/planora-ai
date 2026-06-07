'use client';

import React, { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@planora.ai', password: 'admin123', role: 'Full access + user management', color: '#7c3aed' },
  { label: 'Manager', email: 'manager@planora.ai', password: 'manager123', role: 'S&OP, Finance, all modules', color: '#d97706' },
  { label: 'Planner', email: 'planner@planora.ai', password: 'planner123', role: 'Demand, Inventory, Diagnostics', color: '#2563eb' },
  { label: 'Viewer', email: 'viewer@planora.ai', password: 'viewer123', role: 'Read-only dashboard access', color: '#16a34a' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) setError(result.error ?? 'Login failed.');
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--bg-main)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        width: '45%', background: 'var(--accent-primary)', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem', color: '#fff',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
              <span style={{ display: 'block', width: '7px', height: '14px', borderRadius: '4px 4px 0 0', background: '#6ee7b7' }} />
              <span style={{ display: 'block', width: '7px', height: '22px', borderRadius: '4px 4px 0 0', background: '#6ee7b7' }} />
              <span style={{ display: 'block', width: '7px', height: '10px', borderRadius: '4px 4px 0 0', background: '#fcd34d', opacity: 0.9 }} />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Planora <span style={{ color: '#6ee7b7' }}>AI</span>
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Enterprise Supply Chain Intelligence
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.8, lineHeight: 1.7, maxWidth: '380px' }}>
            Demand planning, inventory optimisation, S&OP, and AI-driven insights — all in one platform.
          </p>
        </div>

        {/* Module highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: '📈', label: 'Demand Planning', desc: 'ML forecasting with 15+ models' },
            { icon: '📦', label: 'Inventory Optimisation', desc: 'Safety stock & replenishment' },
            { icon: '🏢', label: 'S&OP / IBP', desc: 'Capacity & financial reconciliation' },
            { icon: '🤖', label: 'AI Copilot', desc: 'Claude, GPT-4, Gemini & more' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Sign in
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Use your organisation credentials to access the platform.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '10px 12px',
                  border: `1px solid ${error ? '#dc2626' : 'var(--border-color)'}`,
                  borderRadius: '8px', background: 'var(--bg-panel)',
                  color: 'var(--text-main)', fontSize: '0.9rem',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = error ? '#dc2626' : 'var(--border-color)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px',
                    border: `1px solid ${error ? '#dc2626' : 'var(--border-color)'}`,
                    borderRadius: '8px', background: 'var(--bg-panel)',
                    color: 'var(--text-main)', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = error ? '#dc2626' : 'var(--border-color)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'center',
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
              }}>
                <AlertCircle size={15} color="#dc2626" />
                <span style={{ fontSize: '0.825rem', color: '#dc2626' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '11px',
                background: isLoading ? 'var(--text-muted)' : 'var(--accent-primary)',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '0.9rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background 0.2s',
              }}
            >
              {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Demo accounts</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  style={{
                    padding: '10px 12px', border: `1px solid ${acc.color}30`,
                    borderRadius: '8px', background: acc.color + '08',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = acc.color + '15'; e.currentTarget.style.borderColor = acc.color + '60'; }}
                  onMouseOut={e => { e.currentTarget.style.background = acc.color + '08'; e.currentTarget.style.borderColor = acc.color + '30'; }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: acc.color, marginBottom: '2px' }}>{acc.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{acc.role}</div>
                </button>
              ))}
            </div>
          </div>

          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            By signing in you agree to Planora's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
