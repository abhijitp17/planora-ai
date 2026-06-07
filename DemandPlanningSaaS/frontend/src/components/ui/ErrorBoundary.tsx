'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName ?? 'Module'} crashed:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          gap: '1rem',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          margin: '1.5rem 2rem',
          textAlign: 'center',
        }}>
          <AlertCircle size={40} color="#dc2626" />
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600 }}>
              {this.props.moduleName ?? 'Module'} encountered an error
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px' }}>
              {this.state.error?.message ?? 'An unexpected error occurred. Please try refreshing this module.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', borderRadius: '6px',
              background: 'var(--accent-primary)', color: '#fff',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
