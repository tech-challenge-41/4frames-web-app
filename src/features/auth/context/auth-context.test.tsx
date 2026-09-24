import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from './auth-context';
import { useAuth } from './use-auth';
import type { AuthenticatedUserSession } from '../api/auth-api';

const STORAGE_KEY = '4frames.session';

const session: AuthenticatedUserSession = {
  accessToken: 'token-123',
  expireIn: 3600,
  user: { id: '1', email: 'user@user.com' }
};

/** Expõe o contexto na tela para os testes não dependerem de nenhuma página. */
function SessionProbe() {
  const { session: current, setSession, logout } = useAuth();

  return (
    <div>
      <span data-testid="email">{current?.user.email ?? 'sem sessão'}</span>
      <button type="button" onClick={() => setSession(session)}>
        entrar
      </button>
      <button type="button" onClick={logout}>
        sair
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with the session persisted in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    renderProbe();

    expect(screen.getByTestId('email')).toHaveTextContent('user@user.com');
  });

  it('migrates a legacy sessionStorage session to localStorage', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    renderProbe();

    expect(screen.getByTestId('email')).toHaveTextContent('user@user.com');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(session));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('starts without a session when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');

    renderProbe();

    expect(screen.getByTestId('email')).toHaveTextContent('sem sessão');
  });

  it('renders without a session when reading storage throws', () => {
    // Safari privado, cookies de terceiros bloqueados, iframe com storage particionado: o acesso
    // lança em vez de devolver null. Antes, o throw acontecia no useState inicial e a aplicação
    // não renderizava nada.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(() => renderProbe()).not.toThrow();
    expect(screen.getByTestId('email')).toHaveTextContent('sem sessão');
  });

  it('keeps the session in memory when writing to storage throws', async () => {
    // Quota estourada, ou storage em modo somente leitura: o login não pode falhar por isso.
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole('button', { name: 'entrar' }));

    expect(screen.getByTestId('email')).toHaveTextContent('user@user.com');
  });

  it('logs out in memory when removing from storage throws', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole('button', { name: 'sair' }));

    expect(screen.getByTestId('email')).toHaveTextContent('sem sessão');
  });
});
