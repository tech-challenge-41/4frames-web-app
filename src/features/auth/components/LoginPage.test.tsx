import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../context/auth-context';
import * as authApi from '../api/auth-api';

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the login form', () => {
    renderLoginPage();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows an error message when authentication fails', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new Error('Credenciais inválidas'));
    const user = userEvent.setup();

    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@user.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText(/não foi possível conectar/i)).toBeInTheDocument();
    });
  });

  it('submits credentials and stores the session on success', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 'token-123',
      expireIn: 3600,
      user: { id: '1', email: 'user@user.com' }
    });
    const user = userEvent.setup();

    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'user@user.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('user@user.com', '123456');
    });
  });
});
