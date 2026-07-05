// ─────────────────────────────────────────────────────────────────────────────
// Planora AI — Auth token storage (single source of truth)
//
// The access + refresh tokens live in localStorage. Both the API client
// (apiFetch) and AuthContext read/write them through these helpers so there is
// exactly one place that knows where tokens are kept.
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_KEY = 'planora_access_token';
const REFRESH_KEY = 'planora_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    /* storage unavailable — nothing we can do */
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
