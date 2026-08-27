const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface AuthenticatedUserSession {
  accessToken: string;
  expireIn: number;
  user: {
    id: string;
    email: string;
  };
}

export class AuthApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function login(email: string, password: string): Promise<AuthenticatedUserSession> {
  const response = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthApiError(data?.message ?? 'Falha na autenticação', response.status);
  }

  return data as AuthenticatedUserSession;
}
