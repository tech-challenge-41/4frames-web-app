import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthenticatedUserSession } from '../api/auth-api';
import { AuthContext } from './context';

const STORAGE_KEY = '4frames.session';

type StorageKind = 'local' | 'session';

/**
 * Mexer em Storage pode **lançar**, não só devolver null: navegação privada do Safari, cookies de
 * terceiros bloqueados, iframe com storage particionado, quota estourada no setItem. A primeira
 * leitura acontece no `useState` inicial do AuthProvider, então um throw ali derruba a aplicação
 * inteira antes de renderizar qualquer coisa — por isso todo acesso passa por estes helpers.
 * Sem storage, a sessão continua valendo em memória; só não sobrevive a um reload.
 */
function getStorage(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Em alguns navegadores só acessar a propriedade já lança quando o storage está bloqueado.
    return null;
  }
}

function readStorageItem(kind: StorageKind, key: string): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorageItem(kind: StorageKind, key: string, value: string): void {
  try {
    getStorage(kind)?.setItem(key, value);
  } catch {
    // Ignorado de propósito: a sessão em memória já foi atualizada por quem chamou.
  }
}

function removeStorageItem(kind: StorageKind, key: string): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    // Ignorado de propósito: se não dá para apagar, também não dá para ler de volta.
  }
}

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
  const fromLocal = parseStoredSession(readStorageItem('local', STORAGE_KEY));

  if (fromLocal) {
    return fromLocal;
  }

  const legacy = parseStoredSession(readStorageItem('session', STORAGE_KEY));

  if (legacy) {
    writeStorageItem('local', STORAGE_KEY, JSON.stringify(legacy));
    removeStorageItem('session', STORAGE_KEY);
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
    writeStorageItem('local', STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const logout = useCallback(() => {
    removeStorageItem('local', STORAGE_KEY);
    setSessionState(null);
  }, []);

  const value = useMemo(() => ({ session, setSession, logout }), [session, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
