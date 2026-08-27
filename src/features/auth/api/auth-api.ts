import { apiFetch } from '../../../lib/http';

export interface AuthenticatedUserSession {
  accessToken: string;
  expireIn: number;
  user: {
    id: string;
    email: string;
  };
}

export async function login(email: string, password: string): Promise<AuthenticatedUserSession> {
  const response = await apiFetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  return response.json() as Promise<AuthenticatedUserSession>;
}
