import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthApiError, login, type AuthenticatedUserSession } from './lib/auth-api';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<AuthenticatedUserSession | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      setSession(result);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setEmail('');
    setPassword('');
  }

  if (session) {
    return (
      <main className="page">
        <div className="card">
          <span className="logo-mark">4F</span>
          <h1>Bem-vindo</h1>
          <p className="subtitle">Você está autenticado como</p>
          <p className="user-email">{session.user.email}</p>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <span className="logo-mark">4F</span>
        <h1>Entrar</h1>
        <p className="subtitle">Acesse com suas credenciais de funcionário</p>

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

export default App;
