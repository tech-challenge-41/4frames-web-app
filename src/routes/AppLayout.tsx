import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/use-auth';
import './app-layout.css';

export function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="logo-mark logo-mark--sm">4F</span>
        <nav className="app-nav">
          <NavLink to="/my-videos" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Meus vídeos
          </NavLink>
          <NavLink to="/convert" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Converter
          </NavLink>
        </nav>
        <div className="app-user">
          <span className="app-user__email" title={session?.user.email}>
            {session?.user.email}
          </span>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
