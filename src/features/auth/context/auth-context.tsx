import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUserSession } from '../api/auth-api';
import { AuthContext } from './context';

const STORAGE_KEY = '4frames.session';

function parseStoredSession(raw: string | null): AuthenticatedUserSession | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthenticatedUserSession;
  } catch {
    return null;
  }
}

function readStoredSession(): AuthenticatedUserSession | null {
  const fromLocal = parseStoredSession(localStorage.getItem(STORAGE_KEY));

  if (fromLocal) {
    return fromLocal;
  }

  const legacy = parseStoredSession(sessionStorage.getItem(STORAGE_KEY));

  if (legacy) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    sessionStorage.removeItem(STORAGE_KEY);
    return legacy;
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthenticatedUserSession | null>(readStoredSession);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      setSessionState(parseStoredSession(event.newValue));
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSession = useCallback((next: AuthenticatedUserSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  const value = useMemo(() => ({ session, setSession, logout }), [session, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
