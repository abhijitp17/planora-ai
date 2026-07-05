'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthSession, UserRole } from '@/types';
import { loginRequest, fetchMe, persistTokens, clearAuthTokens } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Storage
//
// The access + refresh tokens are managed by lib/authToken (used by apiFetch).
// This session record holds the resolved user for display + the isAuthenticated
// gate; `expiresAt` tracks the refresh-token horizon.
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_KEY = 'planora_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // matches refresh-token lifetime

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

  // apiFetch signals this when a token refresh fails — end the session immediately.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setSession(null);
    };
    window.addEventListener('planora:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('planora:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Exchange credentials for a real token pair.
      const tokens = await loginRequest(email, password);
      persistTokens(tokens);

      // 2. Resolve the authenticated user (server is the source of truth for role/org).
      const me = await fetchMe();
      const user: User = {
        id: String(me.id),
        name: me.name,
        email: me.email,
        role: me.role as UserRole,
        orgId: String(me.organization_id),
      };

      const newSession: AuthSession = {
        user,
        token: tokens.access_token,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      saveSession(newSession);
      setSession(newSession);
      return { success: true };
    } catch (err: any) {
      clearAuthTokens();
      return { success: false, error: err?.message || 'Login failed. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthTokens();
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
