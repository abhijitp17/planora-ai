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
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)',
      fontFamily: 'var(--font-sans)', padding: '2rem', boxSizing: 'border-box'
    }}>
      {/* Center Branding Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ display: 'block', width: '6px', height: '12px', borderRadius: '3px 3px 0 0', background: 'var(--accent-primary)' }} />
          <span style={{ display: 'block', width: '6px', height: '20px', borderRadius: '3px 3px 0 0', background: 'var(--accent-primary)' }} />
          <span style={{ display: 'block', width: '6px', height: '8px', borderRadius: '3px 3px 0 0', background: '#f97316', opacity: 0.9 }} />
        </div>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Planora <span style={{ color: 'var(--accent-primary)' }}>AI</span>
        </span>
      </div>

      {/* Main Login Card */}
      <div style={{
        width: '100%', maxWidth: '380px', background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '2rem', boxSizing: 'border-box',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 1.5rem', textAlign: 'center' }}>
          Login to your Account
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              className="form-control"
              style={{ padding: '8px 12px' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="form-control"
                style={{ padding: '8px 40px 8px 12px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '6px', padding: '8px 10px', marginBottom: '14px',
            }}>
              <AlertCircle size={14} color="#dc2626" />
              <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '8px', fontSize: '0.875rem' }}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Demo account helper below the card */}
      <div style={{ width: '100%', maxWidth: '380px', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Or log in as a demo user</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.label}
              type="button"
              onClick={() => fillDemo(acc)}
              style={{
                padding: '8px 10px', border: `1px solid var(--border-color)`,
                borderRadius: '6px', background: 'var(--bg-panel)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = acc.color; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-panel)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>{acc.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{acc.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
