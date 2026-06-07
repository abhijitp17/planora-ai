'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: '#16a34a', icon: '#16a34a', bg: '#f0fdf4' },
  error:   { border: '#dc2626', icon: '#dc2626', bg: '#fef2f2' },
  warning: { border: '#d97706', icon: '#d97706', bg: '#fffbeb' },
  info:    { border: '#2563eb', icon: '#2563eb', bg: '#eff6ff' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const c = COLORS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.border}`,
      borderRadius: '8px',
      padding: '12px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'slideInToast 0.25s ease',
    }}>
      <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>{ICONS[toast.type]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2937' }}>{toast.title}</div>
        {toast.message && (
          <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px', lineHeight: 1.5 }}>{toast.message}</div>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0', flexShrink: 0 }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [{ id, type, title, message }, ...prev].slice(0, 5));
  }, []);

  const success = useCallback((title: string, message?: string) => toast('success', title, message), [toast]);
  const error   = useCallback((title: string, message?: string) => toast('error',   title, message), [toast]);
  const warning = useCallback((title: string, message?: string) => toast('warning', title, message), [toast]);
  const info    = useCallback((title: string, message?: string) => toast('info',    title, message), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
