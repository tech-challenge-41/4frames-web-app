import { createContext } from 'react';
import type { AuthenticatedUserSession } from '../api/auth-api';

export interface AuthContextValue {
  session: AuthenticatedUserSession | null;
  setSession: (session: AuthenticatedUserSession) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
