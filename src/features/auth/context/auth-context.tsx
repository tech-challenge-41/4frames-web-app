import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUserSession } from '../api/auth-api';
import { AuthContext } from './context';

const STORAGE_KEY = '4frames.session';

function readStoredSession(): AuthenticatedUserSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthenticatedUserSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthenticatedUserSession | null>(readStoredSession);

  const setSession = useCallback((next: AuthenticatedUserSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  const value = useMemo(() => ({ session, setSession, logout }), [session, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
