import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth-api';
import { useAuth } from '../context/use-auth';
import { ApiError } from '../../../lib/http';
import type { LoginRedirectState } from '../context/login-redirect';
import './login-page.css';

/** Tela principal depois do login, quando ninguém pediu outra página. */
const HOME_PATH = '/my-videos';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession, sessionExpired } = useAuth();
  // Só vale o que o ProtectedRoute pôs no estado da navegação: não vem da URL, então não serve de redirecionamento aberto.
  const from = (location.state as LoginRedirectState | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      setSession(result);
      navigate(from && from !== '/login' ? from : HOME_PATH, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="card">
        <span className="logo-mark">4F</span>
        <h1>Entrar</h1>
        <p className="subtitle">Acesse com suas credenciais de funcionário</p>

        {sessionExpired && !error && (
          <p className="error" role="status">
            Sua sessão expirou. Entre de novo para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            maxLength={30}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
