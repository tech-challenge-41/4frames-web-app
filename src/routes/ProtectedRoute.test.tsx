import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import * as authApi from '../features/auth/api/auth-api';
import { LoginPage } from '../features/auth/components/LoginPage';
import { AuthProvider } from '../features/auth/context/auth-context';
import { UNAUTHORIZED_EVENT } from '../lib/http';

const session = { accessToken: 'token-123', expireIn: 3600, user: { id: '1', email: 'user@user.com' } };

/** As mesmas rotas do App, com páginas que só dizem onde se está. */
function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/my-videos" element={<p>tela: meus vídeos</p>} />
            <Route path="/jobs/:jobId" element={<p>tela: job</p>} />
          </Route>
          <Route path="*" element={<Navigate to="/my-videos" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function login() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'user@user.com');
  await user.type(screen.getByLabelText('Senha'), '123456');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('ProtectedRoute and login redirects', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'login').mockResolvedValue(session);
  });

  it('sends an unknown path to "Meus vídeos"', () => {
    localStorage.setItem('4frames.session', JSON.stringify(session));

    renderRoutes('/qualquer-coisa');

    expect(screen.getByText('tela: meus vídeos')).toBeInTheDocument();
  });

  it('goes to "Meus vídeos" after a plain login', async () => {
    renderRoutes('/login');

    await login();

    expect(await screen.findByText('tela: meus vídeos')).toBeInTheDocument();
  });

  it('returns to the requested page after logging in, like the job link in the e-mail', async () => {
    renderRoutes('/jobs/123e4567-e89b-12d3-a456-426614174000');

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    await login();

    expect(await screen.findByText('tela: job')).toBeInTheDocument();
  });

  it('shows the login with an expired-session message when the API rejects the token', () => {
    localStorage.setItem('4frames.session', JSON.stringify(session));
    renderRoutes('/my-videos');
    expect(screen.getByText('tela: meus vídeos')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    });

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou');
  });
});
