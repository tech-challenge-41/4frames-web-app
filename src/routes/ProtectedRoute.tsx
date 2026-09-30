import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { LoginRedirectState } from '../features/auth/context/login-redirect';
import { useAuth } from '../features/auth/context/use-auth';

export function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    const state: LoginRedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }

  return <Outlet />;
}
