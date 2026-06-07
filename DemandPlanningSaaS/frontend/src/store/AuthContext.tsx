'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthSession, UserRole } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock users for development (replace with real backend calls)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@planora.ai': {
    password: 'admin123',
    user: { id: 'u1', name: 'Admin User', email: 'admin@planora.ai', role: 'admin', orgId: 'org1' },
  },
  'manager@planora.ai': {
    password: 'manager123',
    user: { id: 'u2', name: 'Sarah Chen', email: 'manager@planora.ai', role: 'manager', orgId: 'org1' },
  },
  'planner@planora.ai': {
    password: 'planner123',
    user: { id: 'u3', name: 'Raj Patel', email: 'planner@planora.ai', role: 'planner', orgId: 'org1' },
  },
  'viewer@planora.ai': {
    password: 'viewer123',
    user: { id: 'u4', name: 'Guest Viewer', email: 'viewer@planora.ai', role: 'viewer', orgId: 'org1' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_KEY = 'planora_session';

function saveSession(session: AuthSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}
function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) { localStorage.removeItem(SESSION_KEY); return null; }
    return session;
  } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Context types
// ─────────────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (required: UserRole) => boolean;
  can: (action: Action) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC action map
// ─────────────────────────────────────────────────────────────────────────────
export type Action =
  | 'view:dashboard'
  | 'view:demand'
  | 'view:inventory'
  | 'view:diagnostics'
  | 'view:sop'
  | 'view:finance'
  | 'view:analytics'
  | 'edit:forecast'
  | 'edit:consensus'
  | 'upload:dataset'
  | 'run:forecast'
  | 'manage:users'
  | 'manage:settings'
  | 'export:data';

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0, planner: 1, manager: 2, admin: 3,
};

const ACTION_MIN_ROLE: Record<Action, UserRole> = {
  'view:dashboard':    'viewer',
  'view:demand':       'viewer',
  'view:inventory':    'viewer',
  'view:diagnostics':  'planner',
  'view:sop':          'manager',
  'view:finance':      'manager',
  'view:analytics':    'viewer',
  'edit:forecast':     'planner',
  'edit:consensus':    'planner',
  'upload:dataset':    'planner',
  'run:forecast':      'planner',
  'export:data':       'planner',
  'manage:users':      'admin',
  'manage:settings':   'admin',
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved) setSession(saved);
    setIsLoading(false);
  }, []);

  // Auto-refresh check every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = loadSession();
      if (!saved && session) { setSession(null); }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // In production: call POST /api/auth/login, get JWT
    await new Promise(r => setTimeout(r, 600)); // simulate network

    const record = MOCK_USERS[email.toLowerCase()];
    if (!record || record.password !== password) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Create mock JWT session (8h expiry)
    const newSession: AuthSession = {
      user: record.user,
      token: `mock-jwt-${record.user.id}-${Date.now()}`,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };

    saveSession(newSession);
    setSession(newSession);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const hasRole = useCallback((required: UserRole): boolean => {
    if (!session) return false;
    return ROLE_RANK[session.user.role] >= ROLE_RANK[required];
  }, [session]);

  const can = useCallback((action: Action): boolean => {
    if (!session) return false;
    const minRole = ACTION_MIN_ROLE[action];
    return ROLE_RANK[session.user.role] >= ROLE_RANK[minRole];
  }, [session]);

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      isLoading,
      isAuthenticated: !!session,
      login,
      logout,
      hasRole,
      can,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route guard hook
// ─────────────────────────────────────────────────────────────────────────────
export function useRequireAuth(requiredRole?: UserRole) {
  const auth = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated && !redirected.current) {
      redirected.current = true;
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}
