'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<StatusType, { Icon: any; color: string; bg: string; iconLabel: string }> = {
  success: { Icon: CheckCircle2,   color: '#16a34a', bg: '#f0fdf4', iconLabel: '✓' },
  warning: { Icon: AlertTriangle,  color: '#d97706', bg: '#fffbeb', iconLabel: '▲' },
  error:   { Icon: XCircle,        color: '#dc2626', bg: '#fef2f2', iconLabel: '✕' },
  info:    { Icon: Info,           color: '#2563eb', bg: '#eff6ff', iconLabel: 'ℹ' },
  neutral: { Icon: Info,           color: '#64748b', bg: '#f8f9fa', iconLabel: '●' },
};

export function StatusBadge({ status, label, size = 'md', showIcon = true }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  const iconSize = size === 'sm' ? 11 : 13;
  const fontSize = size === 'sm' ? '0.7rem' : '0.75rem';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      borderRadius: '4px', padding, fontSize, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {showIcon && <Icon size={iconSize} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}

// Trend indicator with direction arrow + text
export function TrendBadge({ direction, label }: { direction: 'up' | 'down' | 'flat'; label: string }) {
  const cfg = direction === 'up' ? { Icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' }
    : direction === 'down' ? { Icon: TrendingDown, color: '#dc2626', bg: '#fef2f2' }
    : { Icon: Info, color: '#64748b', bg: '#f8f9fa' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: cfg.color }}>
      <cfg.Icon size={12} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
