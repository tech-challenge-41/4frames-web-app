import { createContext } from 'react';
import type { AuthenticatedUserSession } from '../api/auth-api';

export interface AuthContextValue {
  session: AuthenticatedUserSession | null;
  /** A sessão acabou porque a API recusou o token (401), e não porque o usuário saiu. */
  sessionExpired: boolean;
  setSession: (session: AuthenticatedUserSession) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
